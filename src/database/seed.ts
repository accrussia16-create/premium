import bcrypt from 'bcryptjs';
import { execute, queryOne } from './db';

export async function seedDatabase(): Promise<void> {
  const existingUser = await queryOne('SELECT id FROM users LIMIT 1');
  if (existingUser) {
    return; // Already seeded
  }

  console.log('[Seed] Seeding initial database records...');

  const now = new Date();
  const nowIso = now.toISOString();

  // Create Admin
  const adminPasswordHash = await bcrypt.hash('Admin@123', 10);
  const adminRes = await execute(
    `INSERT INTO users (email, username, password_hash, role, avatar_url, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['admin@upipay.io', 'Admin', adminPasswordHash, 'ADMIN', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', 'ACTIVE', nowIso]
  );
  const adminId = adminRes.lastInsertRowid || 1;

  // Admin Wallet
  await execute(
    `INSERT INTO wallets (user_id, balance, currency, updated_at) VALUES (?, ?, ?, ?)`,
    [adminId, 500, 'CREDITS', nowIso]
  );

  // Create Demo Customer Alex
  const userPasswordHash = await bcrypt.hash('User@123', 10);
  const alexRes = await execute(
    `INSERT INTO users (email, username, password_hash, role, avatar_url, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['alex@upipay.io', 'alex_streamer', userPasswordHash, 'USER', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150', 'ACTIVE', nowIso]
  );
  const alexId = alexRes.lastInsertRowid || 2;

  // Alex Wallet
  await execute(
    `INSERT INTO wallets (user_id, balance, currency, updated_at) VALUES (?, ?, ?, ?)`,
    [alexId, 65, 'CREDITS', nowIso]
  );

  // Initial wallet transaction for Alex
  await execute(
    `INSERT INTO wallet_transactions (user_id, type, amount, balance_before, balance_after, reference, status, description, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [alexId, 'TOP_UP', 85, 0, 85, 'TX-INIT-001', 'COMPLETED', 'Initial Wallet Welcome Top-up via EasyPaisa', nowIso]
  );

  // Seed Products
  const products = [
    {
      slug: 'ai-automation-masterclass',
      title: 'AI Automation Masterclass 2026',
      category: 'Courses',
      icon: 'sparkles',
      thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
      description: 'Master autonomous multi-agent pipelines, n8n orchestrations, and production LLM workflows from scratch. Includes code repositories, templates, and live case studies.',
      price: 20,
      access_duration_type: '30_DAYS',
      demo_type: 'VIDEO',
      demo_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      demo_description: 'Watch the complete Lesson 1 overview on designing resilient autonomous workflows before purchasing.',
      premium_type: 'COURSE',
      premium_resource_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      premium_resource_meta: JSON.stringify({ total_lessons: 5, total_duration_minutes: 104 }),
      tags: 'AI, Automation, LLM, Agents, Python',
      status: 'PUBLISHED',
      rating: 4.9,
      rating_count: 38
    },
    {
      slug: 'deepseek-claude-prompt-engineering-suite',
      title: 'DeepSeek & Claude Prompt Engineering Suite',
      category: 'Prompts',
      icon: 'terminal',
      thumbnail: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&auto=format&fit=crop&q=80',
      description: 'Over 500+ battle-tested system prompts, reasoning heuristics, and JSON extraction templates specifically tuned for DeepSeek V3/R1 and Claude 3.7 Sonnet.',
      price: 15,
      access_duration_type: '90_DAYS',
      demo_type: 'PHOTOS',
      demo_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800',
      demo_description: 'Browse interactive preview screenshots of prompt architectures, JSON schema validators, and output benchmarks.',
      premium_type: 'DIGITAL_RESOURCE',
      premium_resource_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      premium_resource_meta: JSON.stringify({ files_count: 18, download_ready: true }),
      tags: 'Prompts, Claude, DeepSeek, AI, Productivity',
      status: 'PUBLISHED',
      rating: 4.8,
      rating_count: 52
    },
    {
      slug: 'nextgen-ui-ux-design-system-pro',
      title: 'NextGen UI/UX Design System Pro',
      category: 'Design',
      icon: 'palette',
      thumbnail: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&auto=format&fit=crop&q=80',
      description: 'Comprehensive Figma & Tailwind design system with 2,400+ modern components, streaming-ready dark mode tokens, and fluid typography scales.',
      price: 25,
      access_duration_type: 'LIFETIME',
      demo_type: 'EMBED',
      demo_url: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
      demo_description: 'Interactive component preview walkthrough and Figma token mapping tutorial.',
      premium_type: 'DIGITAL_RESOURCE',
      premium_resource_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
      premium_resource_meta: JSON.stringify({ figma_link: true, token_repo: true }),
      tags: 'Design, UI/UX, Figma, Tailwind, Dark Mode',
      status: 'PUBLISHED',
      rating: 5.0,
      rating_count: 27
    },
    {
      slug: 'fullstack-saas-boilerplate-starter-kit',
      title: 'Full-Stack SaaS Boilerplate & Starter Kit',
      category: 'Development',
      icon: 'code',
      thumbnail: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80',
      description: 'Turnkey SaaS starter with JWT auth, credit wallets, payment provider webhooks, SQLite/PostgreSQL dual support, and lightning-fast API architecture.',
      price: 35,
      access_duration_type: 'LIFETIME',
      demo_type: 'VIDEO',
      demo_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      demo_description: 'Watch the 10-minute code architecture tour and architecture diagram breakdown.',
      premium_type: 'COURSE',
      premium_resource_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
      premium_resource_meta: JSON.stringify({ github_repo_included: true, lessons: 6 }),
      tags: 'Development, Node.js, Express, SaaS, Architecture',
      status: 'PUBLISHED',
      rating: 4.9,
      rating_count: 64
    },
    {
      slug: 'autonomous-ai-agents-mastery',
      title: 'Autonomous AI Agents Mastery',
      category: 'AI Tools',
      icon: 'cpu',
      thumbnail: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&auto=format&fit=crop&q=80',
      description: 'Build self-correcting agents with LangGraph, tool-calling APIs, persistent vector memory, and human-in-the-loop governance.',
      price: 18,
      access_duration_type: '7_DAYS',
      demo_type: 'LINK',
      demo_url: 'https://github.com',
      demo_description: 'Official open documentation link and architecture whitepaper.',
      premium_type: 'COURSE',
      premium_resource_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackSeeTheWorld.mp4',
      premium_resource_meta: JSON.stringify({ frameworks: ['LangGraph', 'Express', 'Gemini'] }),
      tags: 'AI, Agents, LangGraph, Automation',
      status: 'PUBLISHED',
      rating: 4.7,
      rating_count: 19
    },
    {
      slug: 'viral-short-form-content-blueprint',
      title: 'Viral Short-Form Content Blueprint',
      category: 'Videos',
      icon: 'video',
      thumbnail: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800&auto=format&fit=crop&q=80',
      description: 'Hook formulas, pacing tactics, dynamic sound design, and retention curves that generate millions of organic impressions on Reels and TikTok.',
      price: 12,
      access_duration_type: '24_HOURS',
      demo_type: 'VIDEO',
      demo_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
      demo_description: 'Watch the first 3 viral hook teardowns for free.',
      premium_type: 'VIDEO',
      premium_resource_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
      premium_resource_meta: JSON.stringify({ duration_minutes: 48 }),
      tags: 'Videos, Content, Marketing, Viral, Editing',
      status: 'PUBLISHED',
      rating: 4.6,
      rating_count: 41
    },
    {
      slug: 'elite-alpha-creators-community',
      title: 'Elite Alpha Creators Private Community',
      category: 'Community',
      icon: 'users',
      thumbnail: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80',
      description: 'Exclusive mastermind access with 6-figure digital creators, weekly private Q&As, asset swaps, and joint venture pitch channels.',
      price: 30,
      access_duration_type: '30_DAYS',
      demo_type: 'PHOTOS',
      demo_url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800',
      demo_description: 'Sneak peek into community deal channels and live member discussions.',
      premium_type: 'COMMUNITY',
      premium_resource_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
      premium_resource_meta: JSON.stringify({ invite_url: 'https://discord.gg/example-private' }),
      tags: 'Community, Mastermind, Networking, Business',
      status: 'PUBLISHED',
      rating: 5.0,
      rating_count: 15
    },
    {
      slug: 'algorithmic-crypto-trading-bot-framework',
      title: 'Algorithmic Crypto Trading Bot Framework',
      category: 'Development',
      icon: 'trending-up',
      thumbnail: 'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?w=800&auto=format&fit=crop&q=80',
      description: 'High-frequency momentum and grid trading algorithms with low-latency WebSocket order execution and backtesting harnesses.',
      price: 40,
      access_duration_type: '90_DAYS',
      demo_type: 'VIDEO',
      demo_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
      demo_description: 'See live paper-trading results and backtesting simulations against 2024-2026 market data.',
      premium_type: 'COURSE',
      premium_resource_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4',
      premium_resource_meta: JSON.stringify({ backtested_strategies: 5 }),
      tags: 'Development, Crypto, Algorithmic, Trading, Python',
      status: 'PUBLISHED',
      rating: 4.8,
      rating_count: 31
    }
  ];

  const productMap: Record<string, number> = {};

  for (const p of products) {
    const res = await execute(
      `INSERT INTO products (
        slug, title, category, icon, thumbnail, description, price,
        access_duration_type, demo_type, demo_url, demo_description,
        premium_type, premium_resource_url, premium_resource_meta,
        tags, status, rating, rating_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        p.slug, p.title, p.category, p.icon, p.thumbnail, p.description, p.price,
        p.access_duration_type, p.demo_type, p.demo_url, p.demo_description,
        p.premium_type, p.premium_resource_url, p.premium_resource_meta,
        p.tags, p.status, p.rating, p.rating_count, nowIso, nowIso
      ]
    );
    const pid = res.lastInsertRowid || 1;
    productMap[p.slug] = pid;

    // Add lessons for courses
    const lessonsData = [
      {
        title: '01 Introduction & Architecture Fundamentals',
        description: 'Understand the core foundations, architecture principles, and tool stack overview.',
        video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        duration: 512,
        isFree: 1
      },
      {
        title: '02 Environment Setup & Security Hardening',
        description: 'Configuring API credentials, isolated execution runtimes, and rate-limiting safeguards.',
        video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        duration: 862,
        isFree: 0
      },
      {
        title: '03 Core Execution Pipelines & Workflows',
        description: 'Building end-to-end multi-step pipelines with automated error recovery and fallbacks.',
        video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        duration: 1245,
        isFree: 0
      },
      {
        title: '04 Advanced Optimization & Production Scaling',
        description: 'Caching layers, worker queues, performance tuning, and low-latency response buffering.',
        video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
        duration: 1410,
        isFree: 0
      },
      {
        title: '05 Complete Capstone Project & Deployment',
        description: 'Deploying the production system live with automated telemetry, health checks, and alerts.',
        video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
        duration: 1680,
        isFree: 0
      }
    ];

    for (let i = 0; i < lessonsData.length; i++) {
      const l = lessonsData[i];
      await execute(
        `INSERT INTO product_lessons (product_id, title, description, video_url, duration_seconds, sort_order, is_free_preview, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [pid, l.title, l.description, l.video, l.duration, i + 1, l.isFree, nowIso]
      );
    }

    // Add demo photos
    const demoPhotos = [
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800',
      'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800',
      'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800'
    ];
    for (let i = 0; i < demoPhotos.length; i++) {
      await execute(
        `INSERT INTO product_media (product_id, media_type, url, caption, sort_order)
         VALUES (?, ?, ?, ?, ?)`,
        [pid, 'DEMO_PHOTO', demoPhotos[i], `Preview Gallery Shot #${i + 1}`, i + 1]
      );
    }
  }

  // Seed Purchases for Alex:
  // 1. AI Automation Masterclass: ACTIVE (purchased 8 days ago, expires in 22 days)
  const masterclassId = productMap['ai-automation-masterclass'];
  const eightDaysAgo = new Date(Date.now() - 8 * 86400 * 1000).toISOString();
  const twentyTwoDaysFuture = new Date(Date.now() + 22 * 86400 * 1000).toISOString();

  await execute(
    `INSERT INTO purchases (user_id, product_id, price_paid, starts_at, expires_at, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [alexId, masterclassId, 20, eightDaysAgo, twentyTwoDaysFuture, 'ACTIVE', eightDaysAgo]
  );

  // Record transaction for this purchase
  await execute(
    `INSERT INTO wallet_transactions (user_id, type, amount, balance_before, balance_after, reference, status, description, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [alexId, 'PURCHASE', -20, 85, 65, 'PUR-AUTO-001', 'COMPLETED', 'Purchase of AI Automation Masterclass 2026 (30 Days Access)', eightDaysAgo]
  );

  // Save video progress for Alex on Lesson 2 (65% complete)
  const firstLesson = await queryOne('SELECT id FROM product_lessons WHERE product_id = ? AND sort_order = 2', [masterclassId]);
  if (firstLesson) {
    await execute(
      `INSERT INTO video_progress (user_id, product_id, lesson_id, position_seconds, duration_seconds, completion_percent, last_watched_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [alexId, masterclassId, firstLesson.id, 560, 862, 65, new Date(Date.now() - 3600 * 1000).toISOString()]
    );
  }

  // 2. Viral Short-Form Content Blueprint: EXPIRED (24 hours access, purchased 3 days ago)
  const viralId = productMap['viral-short-form-content-blueprint'];
  const threeDaysAgo = new Date(Date.now() - 3 * 86400 * 1000).toISOString();
  const twoDaysAgo = new Date(Date.now() - 2 * 86400 * 1000).toISOString();

  await execute(
    `INSERT INTO purchases (user_id, product_id, price_paid, starts_at, expires_at, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [alexId, viralId, 12, threeDaysAgo, twoDaysAgo, 'ACTIVE', threeDaysAgo]
  );

  // Seed Favorites for Alex
  await execute(`INSERT INTO favorites (user_id, product_id, created_at) VALUES (?, ?, ?)`, [alexId, masterclassId, nowIso]);
  await execute(`INSERT INTO favorites (user_id, product_id, created_at) VALUES (?, ?, ?)`, [alexId, productMap['nextgen-ui-ux-design-system-pro'], nowIso]);

  // Seed Reviews
  await execute(
    `INSERT INTO reviews (user_id, product_id, rating, review_text, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [alexId, masterclassId, 5, 'Exceptional quality. The multi-agent orchestration lesson alone saved our agency weeks of testing!', nowIso]
  );

  // Seed Coupons
  await execute(
    `INSERT INTO coupons (code, discount_type, discount_value, usage_limit, times_used, min_purchase, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['WELCOME10', 'PERCENTAGE', 10, 500, 4, 10, 1]
  );
  await execute(
    `INSERT INTO coupons (code, discount_type, discount_value, usage_limit, times_used, min_purchase, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['SAVE5', 'FIXED_CREDITS', 5, 200, 8, 15, 1]
  );

  // Seed Top-Up Requests (one pending for admin demonstration)
  await execute(
    `INSERT INTO topups (user_id, method, amount_credits, amount_fiat, currency, sender_info, reference_id, status, network, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [alexId, 'EASYPAISA', 50, 5000, 'PKR', 'Alex Rivera (0301-9876543)', 'EP-98342187', 'PENDING', null, 'Sent via EasyPaisa App. Attached TID reference.', new Date(Date.now() - 7200 * 1000).toISOString()]
  );

  await execute(
    `INSERT INTO topups (user_id, method, amount_credits, amount_fiat, currency, sender_info, reference_id, status, network, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [alexId, 'USDT', 100, 100, 'USDT', '0x839d...941f', '0x9fa81729bca6352...71e', 'APPROVED', 'TRC20', 'TRC20 auto-confirmed on-chain', new Date(Date.now() - 86400 * 5 * 1000).toISOString()]
  );

  // Seed Notifications
  await execute(
    `INSERT INTO notifications (user_id, title, message, type, is_read, link, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [alexId, 'Welcome to UPI-Pay', 'Your account has been created. 65 test credits are ready in your wallet!', 'INFO', 0, '/wallet', nowIso]
  );
  await execute(
    `INSERT INTO notifications (user_id, title, message, type, is_read, link, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [alexId, 'Access Approaching Expiration', 'Your access to "Viral Short-Form Content Blueprint" has expired. Click here to renew.', 'EXPIRED', 0, '/library', nowIso]
  );

  console.log('[Seed] Database seeded successfully with users, products, lessons, purchases, and topups.');
}
