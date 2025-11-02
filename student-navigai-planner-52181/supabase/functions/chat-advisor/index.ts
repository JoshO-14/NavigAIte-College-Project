import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Get user profile for context
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // Get chat history
    const { data: messages } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(20);

    // Build context from profile
    let profileContext = '';
    if (profile) {
      profileContext = `Student Profile:
- Name: ${profile.full_name || 'Not provided'}
- GPA: ${profile.gpa || 'Not provided'}
- SAT Score: ${profile.sat_score || 'Not provided'}
- ACT Score: ${profile.act_score || 'Not provided'}
- Intended Major: ${profile.intended_major || 'Not provided'}
- Interests: ${profile.interests?.join(', ') || 'Not provided'}
- Location Preference: ${profile.location_preference || 'Not provided'}
- Budget Range: ${profile.budget_range || 'Not provided'}`;
    }

    const systemPrompt = `You are NavigAIte, an expert college advisor AI assistant. Your role is to help high school students navigate the college application process.

${profileContext}

Your capabilities include:
- Providing personalized college recommendations based on student profiles
- Offering guidance on improving academic performance and test scores
- Suggesting extracurricular activities to strengthen applications
- Giving advice on essay writing and application strategies
- Helping with scholarship searches and financial aid questions
- Offering emotional support and stress management tips
- Answering questions about specific colleges and programs
- Creating roadmaps and action plans for college preparation

Always be supportive, encouraging, and provide actionable advice. Consider the student's profile when giving recommendations. Be honest about reach/target/safety schools and help students understand what they can do to improve their chances.`;

    const messageHistory = messages?.map(msg => ({
      role: msg.role,
      content: msg.content
    })) || [];

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          ...messageHistory,
          { role: 'user', content: message }
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI service unavailable. Please contact support.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error('AI gateway error');
    }

    // Save user message
    await supabase.from('chat_messages').insert({
      user_id: user.id,
      role: 'user',
      content: message
    });

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });

  } catch (error) {
    console.error('Chat error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});