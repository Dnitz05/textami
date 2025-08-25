// scripts/setup-storage.js
// Script to create required Supabase Storage buckets
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const requiredBuckets = [
  {
    id: 'template-docx',
    name: 'Template Documents',
    public: true,
    allowedMimeTypes: [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/pdf'
    ]
  },
  {
    id: 'ingest', 
    name: 'Document Ingestion',
    public: false,
    allowedMimeTypes: [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/pdf'
    ]
  },
  {
    id: 'outputs',
    name: 'Generated Documents', 
    public: true,
    allowedMimeTypes: [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  }
];

async function setupStorageBuckets() {
  console.log('🚀 Setting up Supabase Storage buckets...\n');

  // List existing buckets
  const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
  
  if (listError) {
    console.error('❌ Failed to list buckets:', listError);
    return;
  }

  console.log('📋 Existing buckets:', existingBuckets.map(b => b.name));

  for (const bucket of requiredBuckets) {
    const exists = existingBuckets.some(b => b.name === bucket.id);
    
    if (exists) {
      console.log(`✅ Bucket '${bucket.id}' already exists`);
      continue;
    }

    console.log(`📦 Creating bucket '${bucket.id}'...`);
    
    const { data, error } = await supabase.storage.createBucket(bucket.id, {
      public: bucket.public,
      allowedMimeTypes: bucket.allowedMimeTypes,
      fileSizeLimit: 50 * 1024 * 1024, // 50MB
    });

    if (error) {
      console.error(`❌ Failed to create bucket '${bucket.id}':`, error);
    } else {
      console.log(`✅ Created bucket '${bucket.id}' successfully`);
    }
  }

  // Test bucket access
  console.log('\n🧪 Testing bucket access...');
  
  for (const bucket of requiredBuckets) {
    try {
      const { data, error } = await supabase.storage.from(bucket.id).list('', {
        limit: 1
      });
      
      if (error) {
        console.error(`❌ Cannot access bucket '${bucket.id}':`, error.message);
      } else {
        console.log(`✅ Bucket '${bucket.id}' is accessible`);
      }
    } catch (err) {
      console.error(`❌ Error testing bucket '${bucket.id}':`, err.message);
    }
  }

  console.log('\n✅ Storage setup complete!');
}

setupStorageBuckets().catch(console.error);