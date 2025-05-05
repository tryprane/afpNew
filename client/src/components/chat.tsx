import { Button } from "@/components/ui/button";
import {
    
    ChatBubble,
    ChatBubbleMessage,
    ChatBubbleTimestamp,
} from "@/components/ui/chat/chat-bubble";
import { ChatInput } from "@/components/ui/chat/chat-input";
import { ChatMessageList } from "@/components/ui/chat/chat-message-list";
import { useTransition, animated, type AnimatedProps } from "@react-spring/web";
import { Paperclip, Send,  X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Content, UUID } from "@elizaos/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { cn, moment } from "@/lib/utils";
import { Avatar, AvatarImage } from "./ui/avatar";
import CopyButton from "./copy-button";
import ChatTtsButton from "./ui/chat/chat-tts-button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import AIWriter from "react-aiwriter";
import type { IAttachment } from "@/types";
import { AudioRecorder } from "./audio-recorder";
import { Badge } from "./ui/badge";
import { useAutoScroll } from "./ui/chat/hooks/useAutoScroll";
import LoginDialog from "./LoginDIalog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

type ExtraContentFields = {
    user: string;
    createdAt: number;
    isLoading?: boolean;
    content?: {
        data: string;
    };
};

type ContentWithUser = Content & ExtraContentFields;

type AnimatedDivProps = AnimatedProps<{ style: React.CSSProperties }> & {
    children?: React.ReactNode;
};

const isArrayData = (message: any): { headers: string[]; rows: any[] } | null => {
    try {
        // console.log(message)
        if (message.content?.data) {
            const parsedData = JSON.parse(message.content.data);
            // console.log(parsedData)
            if (Array.isArray(parsedData) && parsedData.length > 0 && parsedData[0].headers && parsedData[0].rows) {
                return parsedData[0];
            }
        }
        return null;
    } catch (e) {
        return null;
    }
};

const TableData = ({ headers, rows }: { headers: string[]; rows: any[] }) => {
    return (
        <div className="overflow-x-auto w-full">
            <Table className="text-xs md:text-sm">
                <TableHeader>
                    <TableRow>
                        {headers.map((header, index) => (
                            <TableHead key={index} className="whitespace-nowrap px-2 py-1">
                                {header}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                            {headers.map((header, colIndex) => (
                                <TableCell key={colIndex} className="px-2 py-1 max-w-[200px] overflow-hidden text-ellipsis">
                                    {row[header]}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
};

export default function Page({ agentId }: { agentId: UUID }) {
    const { toast } = useToast();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [input, setInput] = useState("");
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const formRef = useRef<HTMLFormElement>(null);
    const [showLogin, setShowLogin] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isFirstLoad, setIsFirstLoad] = useState(true);

    const queryClient = useQueryClient();

    const getMessageVariant = (role: string) =>
        role !== "user" ? "received" : "sent";

    const { scrollRef, isAtBottom, scrollToBottom, disableAutoScroll } = useAutoScroll({
        smooth: true,
    });
   
    useEffect(() => {
        scrollToBottom();
    }, [queryClient.getQueryData(["messages", agentId])]);

    useEffect(() => {
        scrollToBottom();
        const savedRegistrationNumber = localStorage.getItem('gguRegistrationNumber');
        const savedLoginDate = localStorage.getItem('loginDate');
        
        if (!savedRegistrationNumber || !savedLoginDate) {
            setShowLogin(true);
            return;
        }
        
        const loginDate = new Date(savedLoginDate);
        
        // Check if the date is valid
        if (isNaN(loginDate.getTime())) {
            setShowLogin(true);
            return;
        }
        
        const now = new Date();
        const diffInMinutes = (now.getTime() - loginDate.getTime()) / (1000 * 60);
        
        if (diffInMinutes > 10) {
            setShowLogin(true);
        } else if (isFirstLoad) {
            // Add welcome message on first load after login
            const welcomeMessage = "I have successfully logged into your Samarth Portal account. You can now ask me to perform any portal-related tasks.";
            const existingMessages = queryClient.getQueryData(["messages", agentId]) as ContentWithUser[] || [];
            
            // Check if the welcome message already exists
            const messageExists = existingMessages.some(msg => 
                msg.user === "system" && msg.text === welcomeMessage
            );
            
            // Only add the message if it doesn't already exist
            if (!messageExists) {
                queryClient.setQueryData(
                    ["messages", agentId],
                    (old: ContentWithUser[] = []) => [
                        ...old,
                        {
                            text: welcomeMessage,
                            user: "system",
                            createdAt: Date.now(),
                        }
                    ]
                );
            }
            
            setIsFirstLoad(false);
        }
    }, []);

    

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (e.nativeEvent.isComposing) return;
            handleSendMessage(e as unknown as React.FormEvent<HTMLFormElement>);
        }
    };

    const handleSendMessage = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!input) return;

        const attachments: IAttachment[] | undefined = selectedFile
            ? [
                  {
                      url: URL.createObjectURL(selectedFile),
                      contentType: selectedFile.type,
                      title: selectedFile.name,
                  },
              ]
            : undefined;

        const newMessages = [
            {
                text: input,
                user: "user",
                createdAt: Date.now(),
                attachments,
            },
            {
                text: input,
                user: "system",
                isLoading: true,
                createdAt: Date.now(),
            },
        ];

        queryClient.setQueryData(
            ["messages", agentId],
            (old: ContentWithUser[] = []) => [...old, ...newMessages]
        );

        sendMessageMutation.mutate({
            message: input,
            selectedFile: selectedFile ? selectedFile : null,
        });

        setSelectedFile(null);
        setInput("");
        formRef.current?.reset();
    };

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    const sendMessageMutation = useMutation({
        mutationKey: ["send_message", agentId],
        mutationFn: ({
            message,
            selectedFile,
        }: {
            message: string;
            selectedFile?: File | null;
        }) => apiClient.sendMessage(agentId, message, selectedFile),
        onSuccess: (newMessages: ContentWithUser[]) => {
            console.log(newMessages)
            queryClient.setQueryData(
                ["messages", agentId],
                (old: ContentWithUser[] = []) => [
                    ...old.filter((msg) => !msg.isLoading),
                    ...newMessages.map((msg) => ({
                        ...msg,
                        createdAt: Date.now(),
                    })),
                ]
            );
        },
        onError: (e) => {
            toast({
                variant: "destructive",
                title: "Unable to send message",
                description: e.message,
            });
        },
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file?.type.startsWith("image/")) {
            setSelectedFile(file);
        }
    };

    const messages =
        queryClient.getQueryData<ContentWithUser[]>(["messages", agentId]) ||
        [];

    const transitions = useTransition(messages, {
        keys: (message) =>
            `${message.createdAt}-${message.user}-${message.text}`,
        from: { opacity: 0, transform: "translateY(50px)" },
        enter: { opacity: 1, transform: "translateY(0px)" },
        leave: { opacity: 0, transform: "translateY(10px)" },
    });
    
    const CustomAnimatedDiv = animated.div as React.FC<AnimatedDivProps>;

    return (
        <>
            {selectedImage && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
                    onClick={() => setSelectedImage(null)}
                >
                    <img
                        src={selectedImage}
                        alt="Full screen"
                        className="max-w-[90vw] max-h-[90vh] object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
            <div className="flex flex-col w-full h-[calc(100dvh)] p-4">
            {showLogin && <LoginDialog/>}
                <div className="flex-1 overflow-y-auto">
                    <ChatMessageList 
                        scrollRef={scrollRef}
                        isAtBottom={isAtBottom}
                        scrollToBottom={scrollToBottom}
                        disableAutoScroll={disableAutoScroll}
                    >
                        {transitions((style, message: ContentWithUser) => {
                            const variant = getMessageVariant(message?.user);
                            return (
                                <CustomAnimatedDiv
                                    style={{
                                        ...style,
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "0.5rem",
                                        padding: "1rem",
                                    }}
                                >
                                    <ChatBubble
                                        variant={variant}
                                        className="flex flex-row items-center gap-2"
                                    >
                                        {message?.user !== "user" ? (
                                            <Avatar className="size-8 p-1 border rounded-full select-none">
                                                <AvatarImage src="/ggu.png" />
                                            </Avatar>
                                        ) : null}
                                        <div className="flex flex-col">
                                            <ChatBubbleMessage
                                                isLoading={message?.isLoading}
                                            >
                                                 <div>
                                                {(() => {
                                                            const arrayData = isArrayData(message);
                                                            console.log(arrayData)
                                                           
                                                            if (arrayData) {
                                                                return <TableData {...arrayData} />;
                                                            }
                                                            return null
                                                            
                                                        })()}
                                                </div>
                                                {message?.user !== "user" ? (
                                                    <AIWriter>
                                                        {(() => {
                                                            const arrayData = isArrayData(message);
                                                            console.log(arrayData)
                                                           
                                                            // if (arrayData) {
                                                            //     return <TableData {...arrayData} />;
                                                            // }
                                                            return message?.text;
                                                        })()}
                                                    </AIWriter>
                                                ) : (
                                                    message?.text
                                                )}
                                                {/* Attachments */}

                                               
                                                <div>
                                                    {message?.attachments?.map(
                                                        (attachment: IAttachment) => (
                                                            <div
                                                                className="flex flex-col gap-1 mt-2"
                                                                key={`${attachment.url}-${attachment.title}`}
                                                            >
                                                                {attachment.contentType === "image/png" ? (
                                                                    <img
                                                                        alt="attachment"
                                                                        src={attachment.url}
                                                                        width="100%"
                                                                        height="100%"
                                                                        className="w-64 rounded-md cursor-pointer hover:opacity-80"
                                                                        onClick={() => setSelectedImage(attachment.url)}
                                                                    />
                                                                ) : attachment.contentType === "application/pdf" ? (
                                                                    <div className="flex flex-col items-center p-4 border rounded-lg bg-gray-50">
                                                                        <svg
                                                                            className="w-12 h-12 text-red-500"
                                                                            fill="none"
                                                                            stroke="currentColor"
                                                                            viewBox="0 0 24 24"
                                                                        >
                                                                            <path
                                                                                strokeLinecap="round"
                                                                                strokeLinejoin="round"
                                                                                strokeWidth={2}
                                                                                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                                                                            />
                                                                        </svg>
                                                                        <span className="mt-2 text-sm font-medium text-gray-700">
                                                                            {attachment.title}
                                                                        </span>
                                                                        <button
                                                                            onClick={() => {
                                                                                // Handle base64 PDF data
                                                                                const base64Data = attachment.url.split(',')[1];
                                                                                const byteCharacters = atob(base64Data);
                                                                                const byteNumbers = new Array(byteCharacters.length);
                                                                                for (let i = 0; i < byteCharacters.length; i++) {
                                                                                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                                                                                }
                                                                                const byteArray = new Uint8Array(byteNumbers);
                                                                                const blob = new Blob([byteArray], { type: 'application/pdf' });
                                                                                const url = URL.createObjectURL(blob);
                                                                                
                                                                                // Create a temporary link and trigger download
                                                                                const link = document.createElement('a');
                                                                                link.href = url;
                                                                                link.download = `${attachment.title}.pdf`;
                                                                                document.body.appendChild(link);
                                                                                link.click();
                                                                                document.body.removeChild(link);
                                                                                URL.revokeObjectURL(url);
                                                                            }}
                                                                            className="mt-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                                                        >
                                                                            Download PDF
                                                                        </button>
                                                                    </div>
                                                                ) : null}
                                                                <div className="flex items-center justify-between gap-4">
                                                                    <span />
                                                                    <span />
                                                                </div>
                                                            </div>
                                                        )
                                                    )}
                                                </div>
                                            </ChatBubbleMessage>
                                            <div className="flex items-center gap-4 justify-between w-full mt-1">
                                                {message?.text &&
                                                !message?.isLoading ? (
                                                    <div className="flex items-center gap-1">
                                                        <CopyButton
                                                            text={message?.text}
                                                        />
                                                        <ChatTtsButton
                                                            agentId={agentId}
                                                            text={message?.text}
                                                        />
                                                    </div>
                                                ) : null}
                                                <div
                                                    className={cn([
                                                        message?.isLoading
                                                            ? "mt-2"
                                                            : "",
                                                        "flex items-center justify-between gap-4 select-none",
                                                    ])}
                                                >
                                                    {message?.source ? (
                                                        <Badge variant="outline">
                                                            {message.source}
                                                        </Badge>
                                                    ) : null}
                                                    {message?.action ? (
                                                        <Badge variant="outline">
                                                            {message.action}
                                                        </Badge>
                                                    ) : null}
                                                    {message?.createdAt ? (
                                                        <ChatBubbleTimestamp
                                                            timestamp={moment(
                                                                message?.createdAt
                                                            ).format("LT")}
                                                        />
                                                    ) : null}
                                                </div>
                                            </div>
                                        </div>
                                    </ChatBubble>
                                </CustomAnimatedDiv>
                            );
                        })}
                    </ChatMessageList>
                </div>
                <div className="px-4 pb-4">
                    <form
                        ref={formRef}
                        onSubmit={handleSendMessage}
                        className="relative rounded-md border bg-card"
                    >
                        {selectedFile ? (
                            <div className="p-3 flex">
                                <div className="relative rounded-md border p-2">
                                    <Button
                                        onClick={() => setSelectedFile(null)}
                                        className="absolute -right-2 -top-2 size-[22px] ring-2 ring-background"
                                        variant="outline"
                                        size="icon"
                                    >
                                        <X />
                                    </Button>
                                    <img
                                        alt="Selected file"
                                        src={URL.createObjectURL(selectedFile)}
                                        height="100%"
                                        width="100%"
                                        className="aspect-square object-contain w-16"
                                    />
                                </div>
                            </div>
                        ) : null}
                        <ChatInput
                            ref={inputRef}
                            onKeyDown={handleKeyDown}
                            value={input}
                            onChange={({ target }) => setInput(target.value)}
                            placeholder="Type your message here..."
                            className="min-h-12 resize-none rounded-md bg-card border-0 p-3 shadow-none focus-visible:ring-0"
                        />
                        <div className="flex items-center p-3 pt-0">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                                if (fileInputRef.current) {
                                                    fileInputRef.current.click();
                                                }
                                            }}
                                        >
                                            <Paperclip className="size-4" />
                                            <span className="sr-only">
                                                Attach file
                                            </span>
                                        </Button>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileChange}
                                            accept="image/*"
                                            className="hidden"
                                        />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent side="left">
                                    <p>Attach file</p>
                                </TooltipContent>
                            </Tooltip>
                            <AudioRecorder
                                agentId={agentId}
                                onChange={(newInput: string) => setInput(newInput)}
                            />
                            <Button
                                disabled={!input || sendMessageMutation?.isPending}
                                type="submit"
                                size="sm"
                                className="ml-auto gap-1.5 h-[30px]"
                            >
                                {sendMessageMutation?.isPending
                                    ? "..."
                                    : "Send Message"}
                                <Send className="size-3.5" />
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}
