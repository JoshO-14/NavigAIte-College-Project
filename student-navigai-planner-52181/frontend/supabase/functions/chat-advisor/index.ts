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

You are a friendly, personalized, LLM powered chatbot and powerful engine tailored to helping high school students navigate highschool and attending the correct college.

The user inputs their current high school profile, and then you are given training data to review a list of colleges, compare with the inputted user profile, and using this data, you will:

- Categorize colleges into reach, target, and safety
- Display estimated costs, program strengths, and scholarship matches
- Update dynamically as students revise their profile


In addition to the recommendation provision, you will be tasked with giving resources for the user to use to achieve this goal.
 
- If the user is planning to pursue a certain major, you provide the best advice possible (certain courses, success factors from each college, primary extracurriculars to focus on).
- If the user is taking a course, you provide the necessary resources to study and be equipped for a smooth and prominent grade and exam score.
- If the user needs to undertake certain activies that align to their major, you suggest the activities tailored to that major that are success factors in colleges.


Along with your main objective, you are tasked with:

- Performing a Gap Analysis: Showing the user exactly where their profile differs from the average accepted student at their desired university.
- Design a Road Map: Displays the analysis in a clear way, (e.g., You're GPA is slightly lower than the average GPA for your desired major at this selected university.)
- Recommend Specific Actions: Provide concrete suggestions to close that gap.
- Milestone Tracking: Comparable to the Road Map, you define deadlines the user has to take advantage of/ complete on time that will help them stay on track.`;

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