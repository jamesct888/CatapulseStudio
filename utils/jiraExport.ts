import { UserStory } from "../types";

/**
 * Converts a list of User Stories into a Jira-compatible CSV string.
 * Map:
 * - Summary -> Story Title
 * - Description -> Story Description + Acceptance Criteria + Data Elements
 * - Issue Type -> "Story"
 * - Priority -> "Medium"
 * - Labels -> "GenAI", "Catapulse", Strategy
 */
export const exportStoriesToJiraCsv = (stories: UserStory[], strategyName: string): string => {
    // 1. Define CSV Headers (Standard Jira headers)
    const headers = [
        "Summary",
        "Description",
        "Issue Type",
        "Priority",
        "Labels"
    ];

    // 2. Build Rows
    const rows = stories.map(story => {
        // Format Description to include AC and Data Elements
        let description = `${story.description}\n\n*Acceptance Criteria:*\n`;

        if (Array.isArray(story.acceptanceCriteria)) {
            description += story.acceptanceCriteria.map(ac => `- ${ac}`).join('\n');
        } else {
            description += story.acceptanceCriteria;
        }

        // Add Data Elements content if present
        if (story.dataElements && story.dataElements.length > 0) {
            description += `\n\n*Data Elements:*\n`;
            description += `||Label||Type||Req||Logic||\n`; // Jira Wiki Markup Table Header
            story.dataElements.forEach(el => {
                description += `|${el.label}|${el.type}|${el.required ? 'Yes' : 'No'}|${el.visibility}|\n`;
            });
        }

        // Escape fields for CSV (wrap in quotes, escape internal quotes)
        const safe = (text: string) => {
            if (!text) return "";
            return `"${text.replace(/"/g, '""')}"`; // Standard CSV escaping
        };

        return [
            safe(story.title),
            safe(description),
            safe("Story"),
            safe("Medium"), // Default priority
            safe(`GenAI,Catapulse,${strategyName}`)
        ].join(",");
    });

    // 3. Combine
    return [headers.join(","), ...rows].join("\n");
};

/**
 * Triggers a browser download of the generated CSV.
 */
export const downloadJiraCsv = (stories: UserStory[], strategyName: string) => {
    if (!stories || stories.length === 0) {
        alert("No stories to export!");
        return;
    }

    const csvContent = exportStoriesToJiraCsv(stories, strategyName);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    // Create hidden link
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `jira_stories_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);

    // Trigger click
    link.click();

    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * Parses a Jira CSV export to find Issue Keys matching Story Summaries.
 * Expected CSV Columns: "Summary", "Issue key" (or "Key")
 * Returns a map of Summary -> Key
 */
export const parseJiraCsv = (csvContent: string): Map<string, string> => {
    const lines = csvContent.split(/\r?\n/);
    if (lines.length < 2) return new Map();

    const header = lines[0].toLowerCase().split(',');

    // Find column indices
    const summaryIndex = header.findIndex(h => h.includes('summary'));
    const keyIndex = header.findIndex(h => h.includes('key') || h.includes('issue id'));

    if (summaryIndex === -1 || keyIndex === -1) {
        throw new Error("CSV must contain 'Summary' and 'Key' (or 'Issue Id') columns.");
    }

    const map = new Map<string, string>();

    // Parse Rows
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;

        // Basic CSV split (handling simple quotes if needed, but keeping it simple for now)
        // For robust CSV parsing, a library is better, but we'll assume standard format
        // We'll use a regex to handle quoted commas
        const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
        const cols = line.split(regex).map(c => c.replace(/^"|"$/g, '').trim());

        const summary = cols[summaryIndex];
        const key = cols[keyIndex];

        if (summary && key) {
            map.set(summary, key);
        }
    }

    return map;
};
