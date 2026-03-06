// Supabase Configuration
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const config = window.SUPABASE_CONFIG || {
    url: 'https://your-project-id.supabase.co',
    anonKey: 'your-anon-key'
};

const supabaseUrl = config.url;
const supabaseAnonKey = config.anonKey;

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    }
});

// Auth functions
export const auth = {
    async signUp(email, password, userData) {
        try {
            console.log('Signing up user:', email);
            
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: userData
                }
            });
            
            if (error) throw error;
            
            // Create user profile in database
            if (data.user) {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .insert([
                        {
                            id: data.user.id,
                            full_name: userData.full_name,
                            badge_number: userData.badge_number,
                            department: userData.department,
                            role: 'investigator',
                            created_at: new Date().toISOString()
                        }
                    ]);
                
                if (profileError) {
                    console.error('Profile creation error:', profileError);
                    // Don't throw - user is created but profile failed
                }
            }
            
            return { success: true, data };
        } catch (error) {
            console.error('Signup error:', error);
            return { success: false, error: error.message };
        }
    },
    
    async signIn(email, password) {
        try {
            console.log('Signing in user:', email);
            
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            
            if (error) throw error;
            
            return { success: true, data };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: error.message };
        }
    },
    
    async signOut() {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Logout error:', error);
            return { success: false, error: error.message };
        }
    },
    
    async getCurrentUser() {
        try {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error) throw error;
            
            if (user) {
                // Get user profile
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                
                if (profileError && profileError.code !== 'PGRST116') {
                    console.error('Profile fetch error:', profileError);
                }
                
                return { 
                    success: true, 
                    user: { 
                        ...user, 
                        profile: profile || { 
                            full_name: user.user_metadata?.full_name || 'User',
                            department: user.user_metadata?.department || 'Digital Forensics',
                            badge_number: user.user_metadata?.badge_number || 'N/A'
                        } 
                    } 
                };
            }
            
            return { success: true, user: null };
        } catch (error) {
            console.error('Get current user error:', error);
            return { success: false, error: error.message, user: null };
        }
    }
};

// Cases functions
export const cases = {
    async getAllCases() {
        try {
            const { data, error } = await supabase
                .from('cases')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('Get cases error:', error);
            return { success: false, error: error.message, data: [] };
        }
    },
    
    async getRecentCases(limit = 5) {
        try {
            const { data, error } = await supabase
                .from('cases')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);
            
            if (error) throw error;
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('Get recent cases error:', error);
            return { success: false, error: error.message, data: [] };
        }
    },
    
    async createCase(caseData) {
        try {
            const { data, error } = await supabase
                .from('cases')
                .insert([caseData])
                .select();
            
            if (error) throw error;
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('Create case error:', error);
            return { success: false, error: error.message };
        }
    },
    
    async updateCase(caseId, caseData) {
        try {
            const { data, error } = await supabase
                .from('cases')
                .update(caseData)
                .eq('id', caseId)
                .select();
            
            if (error) throw error;
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('Update case error:', error);
            return { success: false, error: error.message };
        }
    },
    
    async deleteCase(caseId) {
        try {
            const { error } = await supabase
                .from('cases')
                .delete()
                .eq('id', caseId);
            
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Delete case error:', error);
            return { success: false, error: error.message };
        }
    }
};

// Evidence functions
export const evidence = {
    async getAllEvidence() {
        try {
            const { data, error } = await supabase
                .from('evidence')
                .select(`
                    *,
                    cases (
                        case_number,
                        case_title
                    )
                `)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('Get evidence error:', error);
            return { success: false, error: error.message, data: [] };
        }
    },
    
    async createEvidence(evidenceData) {
        try {
            const { data, error } = await supabase
                .from('evidence')
                .insert([evidenceData])
                .select();
            
            if (error) throw error;
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('Create evidence error:', error);
            return { success: false, error: error.message };
        }
    },
    
    async updateEvidence(evidenceId, evidenceData) {
        try {
            const { data, error } = await supabase
                .from('evidence')
                .update(evidenceData)
                .eq('id', evidenceId)
                .select();
            
            if (error) throw error;
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('Update evidence error:', error);
            return { success: false, error: error.message };
        }
    },
    
    async deleteEvidence(evidenceId) {
        try {
            const { error } = await supabase
                .from('evidence')
                .delete()
                .eq('id', evidenceId);
            
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Delete evidence error:', error);
            return { success: false, error: error.message };
        }
    }
};

// Chain of Custody functions
export const chainOfCustody = {
    async createCOCEntry(cocData) {
        try {
            const { data, error } = await supabase
                .from('chain_of_custody')
                .insert([cocData])
                .select();
            
            if (error) throw error;
            
            // Update evidence location
            if (cocData.to_location) {
                await supabase
                    .from('evidence')
                    .update({ 
                        current_location: cocData.to_location,
                        current_custodian: cocData.transferee_name
                    })
                    .eq('id', cocData.evidence_id);
            }
            
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('Create COC entry error:', error);
            return { success: false, error: error.message };
        }
    },
    
    async getEvidenceCOC(evidenceId) {
        try {
            const { data, error } = await supabase
                .from('chain_of_custody')
                .select(`
                    *,
                    profiles:transferred_by (
                        full_name
                    )
                `)
                .eq('evidence_id', evidenceId)
                .order('transfer_date', { ascending: false });
            
            if (error) throw error;
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('Get COC error:', error);
            return { success: false, error: error.message, data: [] };
        }
    }
};

// Real-time subscriptions
export const realtime = {
    subscribeToCases(callback) {
        return supabase
            .channel('cases-changes')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'cases' },
                payload => callback(payload)
            )
            .subscribe();
    },
    
    subscribeToEvidence(callback) {
        return supabase
            .channel('evidence-changes')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'evidence' },
                payload => callback(payload)
            )
            .subscribe();
    },
    
    subscribeToCOC(callback) {
        return supabase
            .channel('coc-changes')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'chain_of_custody' },
                payload => callback(payload)
            )
            .subscribe();
    }
};