import { redirect } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
export async function requireRole(role:'creator'|'moderator') {
 const {data:user}=await supabase.auth.getUser();if(!user.user)throw redirect({to:'/auth'});
 const {data,error}=await supabase.from('user_roles').select('role').eq('user_id',user.user.id);
 if(error)throw new Error('Impossible de vérifier les permissions.');
 const moderator=data.some(r=>r.role==='moderator');
 if(role==='moderator'&&!moderator)throw redirect({to:'/creator'});
 if(role==='creator'&&moderator)throw redirect({to:'/moderation'});
}