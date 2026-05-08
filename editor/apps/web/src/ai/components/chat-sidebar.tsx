"use client";

import { useChat } from "@ai-sdk/react";
import {
	DefaultChatTransport,
	isToolUIPart,
	lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import type { UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { executeEditorTool } from "@/ai/tool-executor";
import { ToolCallDisplay } from "./tool-call-display";

export function ChatSidebar() {
	const [input, setInput] = useState("");
	const [submitError, setSubmitError] = useState<string | null>(null);
	const scrollRef = useRef<HTMLDivElement | null>(null);

	const { messages, sendMessage, status, addToolResult, error } = useChat({
		transport: new DefaultChatTransport({ api: "/api/ai/chat" }),
		sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
		onToolCall: async ({ toolCall }) => {
			const result = executeEditorTool({
				toolName: toolCall.toolName,
				args: toolCall.input,
			});
			await addToolResult({
				tool: toolCall.toolName,
				toolCallId: toolCall.toolCallId,
				output: result,
			});
		},
		onError: (err) => {
			setSubmitError(err.message ?? "Chat request failed.");
		},
	});

	useEffect(() => {
		const node = scrollRef.current;
		if (!node) return;
		node.scrollTop = node.scrollHeight;
	}, [messages.length, status]);

	const isBusy = status === "submitted" || status === "streaming";

	const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const text = input.trim();
		if (!text || isBusy) return;
		setSubmitError(null);
		setInput("");
		try {
			await sendMessage({ text });
		} catch (err) {
			setSubmitError(err instanceof Error ? err.message : String(err));
		}
	};

	return (
		<div className="flex h-full w-full flex-col bg-background border-l">
			<div className="px-3 py-2 border-b flex items-center justify-between">
				<div className="text-sm font-medium">AI Assistant</div>
				<div className="text-[11px] text-muted-foreground">alpha.2</div>
			</div>

			<ScrollArea className="flex-1 min-h-0">
				<div ref={scrollRef} className="p-3 space-y-3 text-sm">
					{messages.length === 0 && (
						<div className="text-muted-foreground text-xs leading-relaxed">
							Try: <span className="font-mono">cut at 3 seconds</span>,{" "}
							<span className="font-mono">what&apos;s on the timeline?</span>, or{" "}
							<span className="font-mono">trim clip X to 2–5s</span>.
						</div>
					)}
					{messages.map((message) => (
						<ChatMessage key={message.id} message={message} />
					))}
					{(submitError || error) && (
						<div className="text-xs text-red-600 dark:text-red-400 border border-red-500/30 rounded-md p-2">
							{submitError ?? error?.message}
						</div>
					)}
				</div>
			</ScrollArea>

			<form onSubmit={onSubmit} className="border-t p-2 flex gap-2">
				<Textarea
					value={input}
					onChange={(event) => setInput(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === "Enter" && !event.shiftKey) {
							event.preventDefault();
							event.currentTarget.form?.requestSubmit();
						}
					}}
					placeholder="Tell the editor what to do…"
					rows={2}
					className="resize-none text-sm min-h-0"
					disabled={isBusy}
				/>
				<Button type="submit" disabled={isBusy || !input.trim()} size="sm">
					{isBusy ? "…" : "Send"}
				</Button>
			</form>
		</div>
	);
}

function ChatMessage({ message }: { message: UIMessage }) {
	const isUser = message.role === "user";
	return (
		<div className={isUser ? "flex justify-end" : "flex justify-start"}>
			<div
				className={`max-w-[90%] space-y-1 rounded-md px-2.5 py-1.5 ${
					isUser ? "bg-primary text-primary-foreground" : "bg-muted"
				}`}
			>
				{message.parts.map((part, index) => {
					const key = `${message.id}-${index}`;
					if (part.type === "text") {
						return (
							<div key={key} className="whitespace-pre-wrap text-sm">
								{part.text}
							</div>
						);
					}
					if (isToolUIPart(part)) {
						return <ToolCallDisplay key={key} part={part} />;
					}
					return null;
				})}
			</div>
		</div>
	);
}
