import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Mic, Trash } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type Props = {
    agentId: string;
    onChange: (newInput: string) => void;
    className?: string;
    timerClassName?: string;
};

export const AudioRecorder = ({
    className,
    timerClassName,
   
    onChange,
}: Props) => {
    const { toast } = useToast();
    const [isRecording, setIsRecording] = useState<boolean>(false);
    const [timer, setTimer] = useState<number>(0);
    const [transcript, setTranscript] = useState<string>("");
    const recognitionRef = useRef<any>(null);
    let timerTimeout: NodeJS.Timeout;

    // Initialize speech recognition
    useEffect(() => {
        if ('webkitSpeechRecognition' in window) {
            const recognition = new (window as any).webkitSpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            console.log(transcript);

            recognition.onresult = (event: any) => {
                const transcript = Array.from(event.results)
                    .map((result: any) => result[0].transcript)
                    .join('');
                setTranscript(transcript);
                onChange(transcript);
            };

            recognition.onerror = (event: any) => {
                console.error('Speech recognition error:', event.error);
                toast({
                    variant: "destructive",
                    title: "Speech recognition error",
                    description: event.error,
                });
                stopRecording();
            };

            recognitionRef.current = recognition;
        } else {
            toast({
                variant: "destructive",
                title: "Speech recognition not supported",
                description: "Your browser doesn't support speech recognition. Please use a modern browser like Chrome.",
            });
        }
    }, []);

    function startRecording() {
        if (recognitionRef.current) {
            try {
                recognitionRef.current.start();
                setIsRecording(true);
                setTranscript("");
            } catch (error) {
                toast({
                    variant: "destructive",
                    title: "Unable to start recording",
                    description: error instanceof Error ? error.message : "Unknown error",
                });
            }
        }
    }

    function stopRecording() {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            setIsRecording(false);
            setTimer(0);
            clearTimeout(timerTimeout);
        }
    }

    // Effect to update the timer every second
    useEffect(() => {
        if (isRecording) {
            timerTimeout = setTimeout(() => {
                setTimer(timer + 1);
            }, 1000);
        }
        return () => clearTimeout(timerTimeout);
    }, [isRecording, timer]);

    // Calculate the hours, minutes, and seconds from the timer
    const minutes = Math.floor((timer % 3600) / 60);
    const seconds = timer % 60;

    const [minuteLeft, minuteRight] = useMemo(
        () => String(minutes).padStart(2, '0').split(''),
        [minutes]
    );
    const [secondLeft, secondRight] = useMemo(
        () => String(seconds).padStart(2, '0').split(''),
        [seconds]
    );

    return (
        <div
            className={cn(
                "flex items-center justify-center gap-2 border-l border-l-transparent border-opacity-0 transition-all duration-300",
                {
                    "border-opacity-100 border-l-border pl-2": isRecording,
                },
                className
            )}
        >
            {isRecording ? (
                <div className="flex gap-1 items-center">
                    <div className="bg-red-500 rounded-full h-2.5 w-2.5 animate-pulse" />
                    <Timer
                        minuteLeft={minuteLeft}
                        minuteRight={minuteRight}
                        secondLeft={secondLeft}
                        secondRight={secondRight}
                        timerClassName={timerClassName}
                    />
                </div>
            ) : null}

            <div className="flex items-center">
                {isRecording ? (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                onClick={stopRecording}
                                size={"icon"}
                                variant="ghost"
                            >
                                <Trash className="size-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent className="m-2">
                            <span>Stop recording</span>
                        </TooltipContent>
                    </Tooltip>
                ) : null}

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={isRecording ? stopRecording : startRecording}
                        >
                            <Mic className="size-4" />
                            <span className="sr-only">Use Microphone</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                        <span>{isRecording ? "Stop" : "Start"} recording</span>
                    </TooltipContent>
                </Tooltip>
            </div>
        </div>
    );
};

const Timer = React.memo(
    ({
        minuteLeft,
        minuteRight,
        secondLeft,
        secondRight,
        timerClassName,
    }: {
        minuteLeft: string;
        minuteRight: string;
        secondLeft: string;
        secondRight: string;
        timerClassName?: string;
    }) => {
        return (
            <div
                className={cn(
                    "text-sm animate-in duration-1000 fade-in-0 select-none",
                    timerClassName
                )}
            >
                <p>
                    {minuteLeft}
                    {minuteRight}:{secondLeft}
                    {secondRight}
                </p>
            </div>
        );
    }
);

Timer.displayName = "Timer";
