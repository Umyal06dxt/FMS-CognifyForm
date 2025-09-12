"use client";
import { Button } from "@/components/ui/button";
import { GradientText } from "@/components/ui/gradient-text";
import { MovingBorder } from "@/components/ui/moving-border";
import { Spotlight } from "@/components/ui/spotlight";
import { useAlert } from "@/hooks/alert-provider";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { HeroBadge } from "./hero-badge";
import { HeroStats } from "./hero-stats";
import { InteractiveShowcase } from "./InteractiveShowcase";
import { VideoShowcase } from "./video-showcase";

export function HeroSection() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const scale = useTransform(scrollYProgress, [0, 1], [0.8, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [0.6, 1]);

  const { showAlert } = useAlert();

  const pushAlert = () => {
    showAlert("Success", "Your operation was successful!", "error");
  };

  return (
    <div className="w-full relative isolate overflow-hidden ">
      <MovingBorder className="rounded-[30px] overflow-hidden ">
        <Spotlight className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4 py-12 bg-background/95 relative pt-28">
          <HeroBadge />

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold max-w-4xl mx-auto my-8 leading-tight">
            Transform Customer <GradientText>Feedback</GradientText> into{" "}
            <GradientText>Actionable Insights</GradientText>
          </h1>

          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mb-8 animate-fade-in [--animation-delay:200ms]">
            Collect, analyze, and act on customer feedback with our powerful
            management system. Make data-driven decisions that drive growth.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-8 animate-fade-in [--animation-delay:400ms]">
            <Button
              size="lg"
              className="group"
              onClick={() => {
                router.push("/dashboard");
              }}
            >
              <span className="mr-2">Get Started</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                pushAlert();
              }}
              className="group"
            >
              <Sparkles className="mr-2 w-4 h-4 transition-all group-hover:text-primary" />
              View Demo
            </Button>
          </div>
          <motion.div
            style={{ scale, opacity }}
            className="w-full max-w-6xl mx-auto mt-16 mb-8"
          >
            <VideoShowcase />
          </motion.div>

          <div className="m-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative lg:mt-8"
            >
              <InteractiveShowcase />
              {/* <div className="absolute  -bottom-24 left-0 w-full h-1 bg-primary" /> */}
            </motion.div>
            <HeroStats />
          </div>
        </Spotlight>
      </MovingBorder>
    </div>
  );
}
