
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ProcessDefinition } from '../types';

// Initialize Supabase Client
let supabase: SupabaseClient | null = null;

const initSupabase = () => {
    const storedUrl = localStorage.getItem('sb_url');
    const storedKey = localStorage.getItem('sb_key');
    
    if (storedUrl && storedKey) {
        try {
            supabase = createClient(storedUrl, storedKey);
        } catch (e) {
            console.error("Failed to init Supabase from local storage", e);
        }
    } else if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
        try {
            supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
        } catch (e) {
            console.error("Failed to init Supabase from env", e);
        }
    }
};

initSupabase();

export interface SavedProcessMeta {
    id: string;
    name: string;
    description?: string; // Optional in DB response based on schema
    updated_at: string;
}

export interface ProcessHistoryEntry {
    id: string; 
    process_id: string;
    created_at: string;
    definition: ProcessDefinition & { _versionComment?: string }; // We inject comment into JSON
}

export const isSupabaseConfigured = () => !!supabase;

export const configureSupabase = (url: string, key: string) => {
    localStorage.setItem('sb_url', url);
    localStorage.setItem('sb_key', key);
    initSupabase();
};

export const disconnectSupabase = () => {
    localStorage.removeItem('sb_url');
    localStorage.removeItem('sb_key');
    supabase = null;
};

const getErrorMessage = (e: any): string => {
    if (typeof e === 'string') return e;
    if (typeof e === 'object' && e !== null) {
        if (e.message) return e.message;
        if (e.error_description) return e.error_description;
        if (e.details) return e.details;
        try { return JSON.stringify(e); } catch { return "Unknown object error"; }
    }
    return "Unknown error";
};

const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

// Returns { success, newId (if ID changed/generated), error }
export const saveProcessToCloud = async (processDef: ProcessDefinition, comment: string = ''): Promise<{ success: boolean, newId?: string, error?: string }> => {
    if (!supabase) return { success: false, error: "Supabase not configured" };

    try {
        let dbId = processDef.id;
        let isNewRecord = false;

        // 1. Resolve Identity (UUID vs String)
        // If current ID is NOT a UUID, we must look it up by name or create new
        if (!isUuid(dbId)) {
            const { data: existing } = await supabase
                .from('processes')
                .select('id')
                .eq('name', processDef.name)
                .single();
            
            if (existing) {
                dbId = existing.id; // Found existing UUID
            } else {
                isNewRecord = true; // Will insert new
            }
        } else {
            // It is a UUID, check if it exists to be safe, or just upsert
            // If the name changed, we might hit a unique constraint on 'name', so we handle that below
        }

        // 2. Prepare Payload
        // We inject the comment into the JSON because the schema lacks a comment column
        const defPayload = { ...processDef, _versionComment: comment };
        
        const mainPayload: any = {
            name: processDef.name,
            definition: defPayload,
            updated_at: new Date().toISOString()
        };

        let resultId = dbId;

        // 3. Upsert / Insert
        if (isNewRecord) {
            // Remove ID from payload to let DB gen_random_uuid()
            const { data, error } = await supabase
                .from('processes')
                .insert(mainPayload)
                .select('id')
                .single();
            
            if (error) throw error;
            resultId = data.id;
        } else {
            // Update existing
            const { error } = await supabase
                .from('processes')
                .update(mainPayload)
                .eq('id', dbId);
            
            if (error) throw error;
        }

        // 4. Insert History (process_versions)
        try {
            await supabase
                .from('process_versions')
                .insert({
                    process_id: resultId,
                    definition: defPayload,
                    created_at: new Date().toISOString()
                });
        } catch (histError) {
            console.warn("History insert failed:", histError);
        }

        return { success: true, newId: resultId };
    } catch (e: any) {
        console.error("Supabase Save Error:", e);
        return { success: false, error: getErrorMessage(e) };
    }
};

export const fetchProcessList = async (): Promise<{ data: SavedProcessMeta[], error?: string }> => {
    if (!supabase) return { data: [], error: "Supabase not configured" };

    try {
        const { data, error } = await supabase
            .from('processes')
            .select('id, name, updated_at') // 'description' is not in the CREATE TABLE schema provided, removed it.
            .order('updated_at', { ascending: false });

        if (error) throw error;
        
        // Map to meta type
        const mapped: SavedProcessMeta[] = (data || []).map((d: any) => ({
            id: d.id,
            name: d.name,
            description: '', // Schema doesn't have description column on root table based on provided DDL
            updated_at: d.updated_at
        }));

        return { data: mapped };
    } catch (e: any) {
        console.error("Supabase List Error:", e);
        return { data: [], error: getErrorMessage(e) };
    }
};

export const loadProcessFromCloud = async (id: string): Promise<{ data: ProcessDefinition | null, error?: string }> => {
    if (!supabase) return { data: null, error: "Supabase not configured" };

    try {
        const { data, error } = await supabase
            .from('processes')
            .select('definition, id') // Get ID to ensure sync
            .eq('id', id)
            .single();

        if (error) throw error;
        
        const def = data?.definition;
        if (def) {
            // Ensure the internal ID matches the DB UUID
            def.id = data.id;
        }
        return { data: def || null };
    } catch (e: any) {
        console.error("Supabase Load Error:", e);
        return { data: null, error: getErrorMessage(e) };
    }
};

export const fetchProcessHistory = async (processId: string): Promise<{ data: ProcessHistoryEntry[], error?: string }> => {
    if (!supabase) return { data: [], error: "Supabase not configured" };

    try {
        const { data, error } = await supabase
            .from('process_versions')
            .select('*')
            .eq('process_id', processId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Map data, extracting comment from JSON if it exists
        const mapped = (data || []).map((d: any) => ({
            id: d.id,
            process_id: d.process_id,
            created_at: d.created_at,
            definition: d.definition,
            comment: d.definition?._versionComment || 'No comment'
        }));

        return { data: mapped };
    } catch (e: any) {
        console.error("History Fetch Error:", e);
        return { data: [], error: getErrorMessage(e) };
    }
};
