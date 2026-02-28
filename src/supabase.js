// src/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ateaphbfxnwnqprydbaz.supabase.co';
const supabaseKey = 'sb_publishable_9L6CfrCtUKJ4-BIQb1imtA_NzkWtjqk';

export const supabase = createClient(supabaseUrl, supabaseKey);