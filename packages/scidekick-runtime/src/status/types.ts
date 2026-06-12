export const RESEARCH_STATUS_STATES = ["neutral", "active", "warning", "blocked", "done"] as const;

export type ResearchStatusState = (typeof RESEARCH_STATUS_STATES)[number];

export type ResearchStatusLabel =
	| "approval"
	| "branch"
	| "cost"
	| "gate"
	| "mode"
	| "model"
	| "phase"
	| "queue"
	| "run"
	| "tokens"
	| "workspace";

export interface ResearchStatusSegment {
	id: string;
	label: ResearchStatusLabel | string;
	value: string;
	priority: number;
	state?: ResearchStatusState;
	sourceEventId?: string;
}
