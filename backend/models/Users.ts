import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
    name: string;
    email: string;
    phone?: number;
    subscription_plan: string;
    subscription_expiry?: Date;
    role: string;
    clerkId: string; // Unique identifier from Clerk
    isActive: boolean;
    ai_generation: number;
    ai_generation_limit: number;
}

const UserSchema: Schema = new Schema(
    {
        name: {
            type: String,
            required: true,
        },
        clerkId: {
            type: String,
            required: true,
            unique: true, // Ensures one-to-one mapping with Clerk
        },
        email: {
            type: String,
            unique: true,
            required: true,
            lowercase: true, // Ensures email is stored in lowercase
        },
        phone: {
            type: Number,
            validate: {
                // Only validate the phone number if it's not null or undefined
                validator: function (v: number) {
                    if (v === null || v === undefined) return true; // Allow null or undefined
                    return /^\d{10}$/.test(v.toString()); // Validates a 10-digit phone number
                },
                message: (props: any) => `${props.value} is not a valid phone number!`,
            },
            required: false, // Make sure the field is not required
        },
        role: {
            type: String,
            enum: ["user", "admin"],
            default: "admin",
        },
        subscription_expiry: {
            type: Date,
            default: null, // Used for premium subscriptions
        },
        subscription_plan: {
            type: String,
            enum: ["free", "admin_v3", "admin_v7", "admin_v10"],
            default: "admin_v10",
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        ai_generation: {
            type: Number,
            default: 10,
        },
        ai_generation_limit: {
            type: Number,
            default: 100,
        },
    },
    {
        timestamps: true,
    }
);

UserSchema.pre('save', function (next) {
    if (this.isNew || this.isModified('subscription_plan')) {
        switch (this.subscription_plan) {
            case 'admin_v3':
                this.ai_generation_limit = 3;
                break;
            case 'admin_v7':
                this.ai_generation_limit = 7;
                break;
            case 'admin_v10':
                this.ai_generation_limit = 10;
                break;
            default: // Handle 'free' or other plans explicitly
                this.ai_generation_limit = 100; // Or any default value you want
                break;
        }
    }
    next();
});


// Create a model from the schema
export default mongoose.model<IUser>("User", UserSchema);
