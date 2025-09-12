import { GoogleGenerativeAI } from "@google/generative-ai";
import { Request, Response, Router } from "express";
import { authenticate } from "../middleware/authenticator";
import Analytics from "../models/Analytics";
import Form from "../models/Form";
import Responses from "../models/Responses";
import User from "../models/Users";

interface AuthenticatedUser {
    _id: string;
}

// Extend the Request type to include the user field
interface RequestWithUser extends Request {
    user?: AuthenticatedUser | null;
}

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.warn("GEMINI_API_KEY is not set in the environment variables");
}

const genAI = new GoogleGenerativeAI(apiKey || "");

const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash-8b",
    systemInstruction: `
You are provided with a feedback form and its responses. Analyze them and provide a summary in the following exact JSON format:

{
  "overall": "Summary of the overall feedback.",
  "next_steps": "The next actionable steps based on the feedback.",
  "key_conclusions": ["Key conclusion 1", "Key conclusion 2", "..."]
}

Please ensure:
1. The JSON is correctly formatted and valid.
2. Summarize feedback clearly and provide actionable insights.`,
});

const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
    responseMimeType: "application/json",
};

async function runAI(prompt: string): Promise<any> {
    try {
        const chatSession = model.startChat({
            generationConfig,
            history: [],
        });

        const result = await chatSession.sendMessage(prompt);
        return JSON.parse(result.response.text()); // Parse AI response directly
    } catch (error) {
        console.error("Error during AI processing:", error);
        throw new Error("Failed to generate analytics from AI.");
    }
}

// Centralized error handler
const handleError = (res: Response, statusCode: number, message: string, error?: any) => {
    console.error(error); // Log error details for debugging

    // If error message indicates AI generation limit exceeded
    if (error && error.message === "AI generation limit exceeded") {
        return res.status(400).json({
            message: "Error updating analytics",
            error: { message: error.message },
        });
    }

    // General error handler for other errors
    res.status(statusCode).json({ message, error });
};

// Utility function to decrement user AI generation limit
async function decrementUserLimit(userId: string): Promise<void> {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    if (user.ai_generation_limit <= 0) {
        throw new Error("AI generation limit exceeded");
    }

    await User.findByIdAndUpdate(userId, {
        ai_generation_limit: user.ai_generation_limit - 1,
    });
}


const router = Router();

/** GET analytics for a specific form by ID */
router.get("/ai/:id", authenticate, async (req: RequestWithUser, res: Response): Promise<any> => {
    const userId = req.user?._id;
    const { id } = req.params;

    if (!id) return res.status(400).json({ message: "Form ID is required" });
    if (!userId) return res.status(401).json({ message: "Authentication required" });


    try {
        // Check if analytics already exist
        let analytics = await Analytics.findOne({ formId: id });

        if (!analytics) {
            // Fetch form and responses
            const form = await Form.findById(id);
            if (!form) return res.status(404).json({ message: "Form not found" });

            // Decrement AI generation limit
            await decrementUserLimit(userId);

            const responses = await Responses.find({ formId: id });

            // Run AI model
            const aiResponse = await runAI(JSON.stringify({ form, responses }));

            // Save analytics to the database
            analytics = await Analytics.create({
                formId: id,
                ...aiResponse,
            });

        }

        res.json(analytics);
    } catch (error) {
        handleError(res, 500, "Error generating analytics", error);
    }
});

/** POST to update analytics for a specific form */
router.post("/ai/push/:id", authenticate, async (req: RequestWithUser, res: Response): Promise<any> => {
    const userId = req.user?._id;
    const { id } = req.params;
    console.log("id", id, "userId", userId);

    if (!id) return res.status(400).json({ message: "Form ID is required" });
    if (!userId) return res.status(401).json({ message: "Authentication required" });

    try {
        // Fetch form and responses
        const form = await Form.findById(id);
        if (!form) return res.status(404).json({ message: "Form not found" });

        const responses = await Responses.find({ formId: id });

        // Run AI model
        const aiResponse = await runAI(JSON.stringify({ form, responses }));

        // Check if analytics already exist
        let analytics = await Analytics.findOne({ formId: id });

        if (analytics) {
            // Update existing analytics
            Object.assign(analytics, aiResponse, { updatedOn: new Date() });
            await analytics.save();
        } else {
            // Create new analytics
            analytics = await Analytics.create({
                formId: id,
                ...aiResponse,
            });
        }

        // Decrement AI generation limit
        await decrementUserLimit(userId);

        res.json(analytics);
    } catch (error) {
        handleError(res, 500, "Error updating analytics", error);
    }
});


// TODO: Leaveing this for now but will se if needed afterwards
router.get('/checktokens', authenticate,  async (req: RequestWithUser, res: Response): Promise<any> => {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Authentication required" });
    try {
        const user = await User.findById(userId);
        if (!user) throw new Error("User not found");
        res.json({tokens: user.ai_generation_limit});
    } catch (error) {
        handleError(res, 500, "Error checking tokens", error);
    }
});


router.post('/sendtokens', authenticate, async (req: RequestWithUser, res: Response): Promise<any> => {
    const userId = req.user?._id;

    if (!userId) return res.status(401).json({ message: "Authentication required" });
    try {
        const user = await User.findById(userId);
        if (!user) throw new Error("User not found");
        await User.findByIdAndUpdate(userId, {
            ai_generation_limit: user.ai_generation_limit - 1,
        });
        res.status(200).json({ message: "Tokens sent successfully" });
    } catch (error) {
        handleError(res, 500, "Error sending tokens", error);
    }
})


export const admin = router;
