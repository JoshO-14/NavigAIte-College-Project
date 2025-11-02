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

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Profile not found');
    }

    // Get all colleges
    const { data: colleges, error: collegesError } = await supabase
      .from('colleges')
      .select('*');

    if (collegesError || !colleges) {
      throw new Error('Failed to fetch colleges');
    }

    // Calculate match scores and categories for each college
    const recommendations = colleges.map(college => {
      const score = calculateMatchScore(profile, college);
      const category = determineCategory(profile, college);
      
      return {
        college_id: college.id,
        user_id: user.id,
        category,
        match_score: score,
        notes: generateNotes(profile, college, category)
      };
    }).sort((a, b) => b.match_score - a.match_score);

    // Clear existing recommendations
    await supabase
      .from('user_colleges')
      .delete()
      .eq('user_id', user.id);

    // Insert new recommendations
    const { error: insertError } = await supabase
      .from('user_colleges')
      .insert(recommendations);

    if (insertError) {
      console.error('Insert error:', insertError);
      throw new Error('Failed to save recommendations');
    }

    // Generate initial milestones if none exist
    const { data: existingMilestones } = await supabase
      .from('progress_milestones')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);

    if (!existingMilestones || existingMilestones.length === 0) {
      const initialMilestones = [
        {
          user_id: user.id,
          title: 'Complete SAT/ACT Prep',
          description: 'Prepare and take standardized tests',
          category: 'Testing',
          deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          user_id: user.id,
          title: 'Draft College Essays',
          description: 'Write and refine your personal statement',
          category: 'Essays',
          deadline: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          user_id: user.id,
          title: 'Submit Applications',
          description: 'Complete and submit college applications',
          category: 'Applications',
          deadline: new Date(Date.now() + 150 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          user_id: user.id,
          title: 'Request Recommendation Letters',
          description: 'Ask teachers for letters of recommendation',
          category: 'Recommendations',
          deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];

      await supabase.from('progress_milestones').insert(initialMilestones);
    }

    return new Response(JSON.stringify({ success: true, count: recommendations.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Recommendation error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function calculateMatchScore(profile: any, college: any): number {
  let score = 50; // Base score

  // GPA matching
  if (profile.gpa && college.avg_gpa) {
    const gpaDiff = Math.abs(profile.gpa - college.avg_gpa);
    score += Math.max(0, 20 - gpaDiff * 40); // Up to 20 points for GPA match
  }

  // SAT matching
  if (profile.sat_score && college.avg_sat) {
    const satDiff = Math.abs(profile.sat_score - college.avg_sat);
    score += Math.max(0, 15 - satDiff / 20); // Up to 15 points for SAT match
  }

  // ACT matching
  if (profile.act_score && college.avg_act) {
    const actDiff = Math.abs(profile.act_score - college.avg_act);
    score += Math.max(0, 15 - actDiff * 3); // Up to 15 points for ACT match
  }

  // Major matching
  if (profile.intended_major && college.majors && college.majors.includes(profile.intended_major)) {
    score += 10; // 10 points for major match
  }

  return Math.min(100, Math.max(0, Math.round(score)));
}

function determineCategory(profile: any, college: any): string {
  const userStats = {
    gpa: profile.gpa || 0,
    sat: profile.sat_score || 0,
    act: profile.act_score || 0
  };

  const collegeStats = {
    gpa: college.avg_gpa || 0,
    sat: college.avg_sat || 0,
    act: college.avg_act || 0
  };

  let aboveCount = 0;
  let totalCount = 0;

  if (userStats.gpa > 0 && collegeStats.gpa > 0) {
    if (userStats.gpa >= collegeStats.gpa + 0.15) aboveCount++;
    totalCount++;
  }

  if (userStats.sat > 0 && collegeStats.sat > 0) {
    if (userStats.sat >= collegeStats.sat + 80) aboveCount++;
    totalCount++;
  }

  if (userStats.act > 0 && collegeStats.act > 0) {
    if (userStats.act >= collegeStats.act + 2) aboveCount++;
    totalCount++;
  }

  if (totalCount === 0) return 'target';

  const ratio = aboveCount / totalCount;

  if (ratio >= 0.67) return 'safety';
  if (ratio <= 0.33) return 'reach';
  return 'target';
}

function generateNotes(profile: any, college: any, category: string): string {
  const notes = [];
  
  if (profile.gpa && college.avg_gpa) {
    const diff = profile.gpa - college.avg_gpa;
    if (Math.abs(diff) > 0.2) {
      notes.push(`Your GPA is ${diff > 0 ? 'above' : 'below'} the average by ${Math.abs(diff).toFixed(2)} points`);
    }
  }

  if (profile.sat_score && college.avg_sat) {
    const diff = profile.sat_score - college.avg_sat;
    if (Math.abs(diff) > 50) {
      notes.push(`Your SAT is ${diff > 0 ? 'above' : 'below'} average by ${Math.abs(diff)} points`);
    }
  }

  if (category === 'reach') {
    notes.push('Focus on strong essays and recommendations to stand out');
  } else if (category === 'safety') {
    notes.push('Strong candidate - consider merit scholarships');
  }

  return notes.join('. ');
}