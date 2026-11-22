import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { AuthScreen } from '@/components/auth-screen';
import { supabase } from '@/integrations/supabase/client';
export const Route=createFileRoute('/')({head:()=>({meta:[{title:'CreativeScroll · Votre espace créatif'},{name:'description',content:'Créez et gérez vos quiz, documents, puzzles et vidéos avec CreativeScroll.'},{property:'og:title',content:'CreativeScroll · Votre espace créatif'},{property:'og:description',content:'Un espace de création. Des contenus qui comptent.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:Index});
function Index(){const navigate=useNavigate();useEffect(()=>{let active=true;void supabase.auth.getUser().then(async ({data})=>{if(!data.user)return;const roles=await supabase.from('user_roles').select('role').eq('user_id',data.user.id);if(active && !roles.error)void navigate({to:roles.data.some(x=>x.role==='moderator')?'/moderation':'/creator',replace:true});});return()=>{active=false;};},[navigate]);return <AuthScreen/>;}
