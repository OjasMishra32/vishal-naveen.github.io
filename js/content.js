// Single source of truth for every fact on the site.
// Every claim here is taken from the resume, Vishal's own answers, or a verified public repo.
// Sections must render from this file and never invent numbers. Caveats travel with their numbers:
// if you move a figure, move its qualifier with it.

export const content = {
  person: {
    name: 'Vishal Naveen',
    first: 'Vishal',
    last: 'Naveen',
    initials: 'VN',
    role: 'Electrical Engineering @ University of Florida',
    focus: ['Robotics', 'Embedded systems', 'Robot learning', 'Perception research'],
    tagline: 'I build robots that learn, from bare-metal firmware up to the policy.',
    statement:
      "I'm an electrical engineering student at the University of Florida. I write bare-metal Rust firmware for " +
      "Gator Motorsports' telemetry, research certified 3D perception for self-driving cars in the TEA Lab, and train " +
      'manipulation policies on a sub-$300 robot arm I built.',
    // The hero's at-a-glance list: [what, where].
    creds: [
      ['Electrical Engineering', 'University of Florida, Honors Program'],
      ['Firmware Engineer', 'Gator Motorsports (Formula SAE)'],
      ['Undergraduate Researcher', 'TEA Lab, University of Florida'],
      ['3rd of 141 teams', 'SwampHacks XII, Best Overall'],
    ],
    location: 'Gainesville, FL',
    hometown: 'Tampa, FL',
    coords: '29.6516° N, 82.3248° W',
    timezone: 'America/New_York',
    email: 'vishalnaveen@ufl.edu',
    status: 'Open to research & internship opportunities',
    links: {
      github: 'https://github.com/vishal-naveen',
      linkedin: 'https://www.linkedin.com/in/vishalnaveen/',
      resume: 'assets/Vishal_Naveen_Resume.pdf',
    },
  },

  education: {
    school: 'University of Florida',
    degree: 'B.S. Electrical Engineering',
    minor: 'Minor in Computer Science',
    grad: 'May 2029',
    gpa: '4.0',
    location: 'Gainesville, FL',
    honors: ['Honors Program', 'Florida Academic Scholars', 'UF Honors Scholarship'],
  },

  // The proof strip under the hero: six numbers, each with the context it needs. `href` opens the source.
  highlights: [
    { value: '3rd / 141', label: 'teams at SwampHacks XII', detail: 'Zer0Sh0t: 3rd Place, Best Overall. Team of 4; I wrote the code.', href: '#work/zeroshot' },
    { value: '18/20', label: 'robot policy success', detail: 'ACT on a sub-$300 arm; both policies solved a cell held out of training.', href: '#work/tactilevla' },
    { value: '32', label: 'perception models trained', detail: '~120 NVIDIA B200 GPU-hours for a TEA Lab loss-design study.', href: '#experience' },
    { value: '10 Hz', label: 'live car telemetry in Rust', detail: 'Bare-metal Cortex-M7 firmware over 1 Gbps Ethernet, under 0.001% of the link.', href: '#experience' },
    { value: '0', label: 'divergences in 100K operations', detail: 'C++17 flash translation layer, replayed against a reference model.', href: '#experience' },
    { value: '105 pts', label: 'autonomous routine', detail: 'FTC state record that tied the world record at the time.', href: '#work/intothedeep' },
  ],

  // Named numbers other sections look up by id. `display` is the exact rendered string.
  stats: [
    { id: 'act', value: 18, display: '18/20', label: 'ACT policy success', source: 'TactileVLA-Edge' },
    { id: 'smolvla', value: 16, display: '16/20', label: 'SmolVLA-450M success', source: 'TactileVLA-Edge' },
    { id: 'demos', value: 160, display: '160', label: 'Teleoperated demonstrations', source: 'TactileVLA-Edge' },
    { id: 'auto', value: 105, display: '105 pts', label: 'Autonomous routine', source: 'Middleton Robotics' },
    { id: 'teams', value: 2500, display: '2,500+', label: 'FTC teams use Pedro Pathing', source: 'Pedro Pathing' },
    { id: 'funding', value: 33000, display: '$33,000', label: 'Raised as captain', source: 'Middleton Robotics' },
  ],

  // Order is the page order: robotics and embedded first. `featured` projects get the large cards in #lab;
  // the rest are the grid in #work. Every project opens a case study at #work/<id>.
  projects: [
    {
      id: 'tactilevla',
      featured: true,
      title: 'TactileVLA-Edge',
      kicker: 'Independent robotics research',
      period: 'Jun 2026 — Present',
      year: '2026',
      summary: 'Imitation-learning policies for robot manipulation on a sub-$300 SO-101 arm. Both generalize to a workspace cell they never saw in training.',
      card: {
        summary: 'Imitation-learning policies on a sub-$300 SO-101 arm, tested on a workspace cell they never saw in training.',
        chips: ['Vision only', 'LeRobot', 'PyTorch', 'ACT', 'SmolVLA'],
        metrics: [['18/20', 'ACT policy success'], ['16/20', 'SmolVLA-450M success'], ['160', 'teleoperated demos']],
        grid: '8 outer cells, 20 demos each. Cell B2 was held out of training.',
      },
      metric: { display: '18/20', label: 'ACT success · held-out cell solved' },
      metrics: [
        { value: '18/20', label: 'ACT policy success' },
        { value: '16/20', label: 'SmolVLA-450M success' },
        { value: '67,693', label: 'frames in the dataset' },
        { value: '<$300', label: 'SO-101 leader-follower rig' },
      ],
      stack: ['LeRobot', 'PyTorch', 'ACT', 'SmolVLA', 'Python'],
      how: [
        '**Teleoperate.** I move the leader arm by hand and the follower arm copies it, so every demonstration is a real motion of the robot.',
        '**Collect.** 20 demonstrations in each of the 8 outer cells of a 3×3 grid, sweeping 19 grasp orientations. The centre cell, B2, gets none.',
        '**Train.** An ACT policy, and a fine-tuned SmolVLA (450M), in LeRobot on one consumer GPU.',
        '**Test.** Deformable-object pick-and-place trials, including the never-seen cell B2.',
      ],
      results: [
        'ACT: **18/20** successful pick-and-place trials on a deformable object',
        'SmolVLA (450M, fine-tuned): **16/20**',
        'Both policies solved held-out cell **B2**, which appears in none of the 160 training episodes',
        'Dataset: **160** demonstrations, **67,693** frames',
        'Hardware: an SO-101 leader-follower rig built for under **$300**',
      ],
      bullets: [
        'Trained an ACT policy and fine-tuned SmolVLA (450M) in LeRobot on a single consumer GPU: 18/20 and 16/20 success on deformable-object pick-and-place.',
        'Collected 160 teleoperated demonstrations (67,693 frames), 20 per cell across the 8 outer cells of a 3×3 grid, sweeping 19 grasp orientations.',
        'Assembled an SO-101 leader-follower rig for under $300 (I move one arm by hand and the robot copies it) and published the dataset and evaluation protocol.',
        "Patched LeRobot's recording and motor code (phase-aware controls, camera-stall tolerance, retries on dropped packets) so multi-hour recording sessions stayed stable.",
        'Demonstrated spatial generalization: both policies solved held-out cell B2, absent from all 160 training episodes.',
        'Submitted a patch to Hugging Face LeRobot (PR #3798) diagnosing a streaming-dataset collate crash on unconverted PIL images: 86 lines across 2 files with a regression test.',
      ],
      media: [
        { type: 'video', src: 'assets/media/act-b2.mp4', poster: 'assets/media/poster-act-b2-grasp.jpg', caption: 'ACT in held-out cell B2', portrait: true },
        { type: 'video', src: 'assets/media/smolvla-b2.mp4', poster: 'assets/media/poster-smolvla-b2-grasp.jpg', caption: 'SmolVLA-450M in held-out cell B2', portrait: true },
        { type: 'video', src: 'assets/media/recording-timelapse.mp4', poster: 'assets/media/poster-timelapse.jpg', caption: 'Recording the 160-demo grid dataset' },
        { type: 'image', src: 'assets/media/grid-session-b2.jpg', caption: 'The 3×3 workspace grid' },
      ],
      links: [
        { label: 'Repository', href: 'https://github.com/vishal-naveen/TactileVLA-Edge' },
        { label: 'Project site', href: 'https://vishal-naveen.github.io/TactileVLA-Edge/' },
        { label: 'LeRobot PR #3798', href: 'https://github.com/huggingface/lerobot/pull/3798' },
      ],
    },
    {
      id: 'zeroshot',
      featured: true,
      title: 'Zer0Sh0t',
      kicker: 'SwampHacks XII · 3rd Place, Best Overall',
      period: 'Oct 2026',
      year: '2026',
      award: '3rd Place, Best Overall · SwampHacks XII · 141 teams',
      team: {
        size: 4,
        members: ['Srijan Kumbam', 'Vishal Naveen', 'Siddharth Mohan', 'Hao Tran'],
        mine: 'I wrote the entire codebase end to end. The award and the demo are the team’s.',
      },
      summary: 'A voice-controlled, low-cost robot arm that zero-shots new tasks: it turns spoken requests into pick, place and point actions with no task-specific demonstrations or retraining.',
      // The catchy line and the precise one always appear together.
      pitch: 'Any task, any object, any room, zero training.',
      scope: 'In practice: objects from a measured prop catalog, moved to predefined destination zones.',
      card: {
        summary: 'Spoken requests become pick, place and point actions on my SO-101 arm, with no task-specific demonstrations or retraining.',
        chips: ['Claude tool use', 'Gemini Robotics-ER', 'ElevenLabs', 'Inverse kinematics'],
        metrics: [['3rd / 141', 'Best Overall'], ['47 s', 'two-cube color sort'], ['2.4 / 9.2 mm', 'placement error']],
      },
      metric: { display: '3rd / 141', label: 'Best Overall, SwampHacks XII' },
      metrics: [
        { value: '3rd / 141', label: 'Best Overall, SwampHacks XII' },
        { value: '47 s', label: 'to sort two cubes by color' },
        { value: '2.4 / 9.2 mm', label: 'placement error on the two cubes' },
        { value: '0', label: 'task-specific demonstrations' },
      ],
      stack: ['Claude tool use', 'Gemini Robotics-ER 2', 'ElevenLabs', 'AprilTags', 'Inverse kinematics', 'SO-101'],
      how: [
        '**Hear.** ElevenLabs transcribes the spoken request.',
        '**Decide.** A local command router handles common commands. Claude handles open-ended requests through tool calls (pick, place, point) that name object IDs and destination zones.',
        '**See.** Gemini Robotics-ER 2 Preview returns object labels and image locations. A local vision system links them to tracked objects using calibrated geometry, the prop catalog and AprilTags.',
        '**Move.** Calibrated coordinates and inverse kinematics turn each tool call into motion, with motion checks, behind a fail-closed safety runner.',
      ],
      results: [
        '**3rd Place, Best Overall** at SwampHacks XII, out of **141** teams (team of 4)',
        'Recorded test: fetched a cube to a handover pad',
        'Recorded test: sorted two cubes by color in **47 s**, with **2.4 mm** and **9.2 mm** placement error',
        'No task-specific demonstrations or retraining: the task comes from the spoken request',
      ],
      bullets: [
        'Wrote the entire codebase end to end: speech in, the command router and Claude tool calls, vision grounding with Gemini Robotics-ER and AprilTags, inverse kinematics and motion checks, and the fail-closed safety runner.',
        'Ran it on my own SO-101 arm, the one I built for TactileVLA-Edge.',
      ],
      media: [
        { type: 'video', src: 'assets/media/zeroshot-loop.mp4', poster: 'assets/media/poster-zeroshot-loop.jpg', caption: 'The SO-101 on the demo rig (a preset routine at 6× speed, as labelled in the film)', card: true, caseHide: true, ar: '960 / 440' },
        { type: 'video', src: 'assets/media/zeroshot-film.mp4', poster: 'assets/media/poster-zeroshot-film.jpg', caption: 'The Zer0Sh0t film. Arm shots marked “Preset demo” are preset routines.' },
        { type: 'image', src: 'assets/media/zeroshot-planner-ui.jpg', caption: 'The planner over the live camera view: Claude plans each move while the arm stays still' },
      ],
      links: [
        { label: 'Devpost', href: 'https://devpost.com/software/beforehand-eliv7x' },
      ],
    },
    {
      id: 'lucid',
      featured: true,
      title: 'Lucid Dreams',
      kicker: 'Gator Hack V · Top 10 Finalist',
      period: 'Oct 2026',
      year: '2026',
      award: 'Top 10 Finalist · Gator Hack V (UF AI Days 2026)',
      team: {
        size: 4,
        members: ['Ojasva Mishra', 'Atina Ruvinova', 'Ian Hoang', 'Vishal Naveen'],
        mine: 'Team product. My part: Court Side, the animated-avatar pipeline and the GPU job scripts.',
      },
      summary: 'A team of 4 built it: it turns a video or a few photos into a photoreal, life-size 3D person standing in your room, in Meta Quest passthrough, opened from one link in the Quest browser.',
      card: {
        summary: 'A team build that turns a video or a few photos into a photoreal, life-size 3D person in Meta Quest passthrough. I built Court Side and the animated avatars.',
        chips: ['TypeScript', 'three.js', 'WebXR', 'Gaussian splatting'],
        metrics: [['48', 'views from one clip'], ['12', 'NVIDIA B200 GPUs'], ['3.1 s', 'median Talk reply']],
      },
      metric: { display: 'Top 10', label: 'Finalist, Gator Hack V' },
      metrics: [
        { value: 'Top 10', label: 'Finalist, Gator Hack V' },
        { value: '48', label: 'synchronized views from one clip' },
        { value: '26.0–31.9 dB', label: 'replay PSNR (0.963–0.982 SSIM)' },
        { value: '3.1 s', label: 'median Talk reply (11 tries)' },
      ],
      stack: ['TypeScript', 'three.js', 'WebXR', 'gsplat', 'LHM++', 'SMPL-X', 'Meta Quest'],
      how: [
        '**Views.** 4DAnyone (SIGGRAPH Asia 2026) turns one clip into 48 synchronized views.',
        '**Fit.** Each person is fit as 4D Gaussians with gsplat on 12 NVIDIA B200 GPUs: 7,000 Adam steps for the first frame, then 1,500 per frame, about 290K Gaussians per frame.',
        '**Render.** On the headset it keeps the 160K most important Gaussians and renders at 70% resolution, with a governor holding the fill-rate budget.',
        '**Use.** Learn (lessons with follow-along markers), Play (chess against Fischer and Carlsen likenesses, tennis against a Federer likeness, shooting with LeBron), Court Side, and Talk (cloned-voice replies).',
      ],
      results: [
        '**Top 10 Finalist** at Gator Hack V (team of 4), built in one weekend on real footage',
        'Replays reach **26.0–31.9 dB** PSNR and **0.963–0.982** SSIM',
        'Talk mode answers in **3.1 s** median (11 tries)',
        'Phantom-limb fix: spill outside the person **2.3% → 0.4%**, view PSNR up **0.5–2.1 dB**',
      ],
      bullets: [
        '**Court Side** (TypeScript, three.js, WebXR): rebuilds a real NBA play at life size so you can freeze it mid-air and walk around the players. I built the player assembly pipeline, headset frame-time telemetry, a per-body Gaussian splat budget, demo mode with floor guides, sound design, and real-time end-to-end tests.',
        '**Animated avatars:** LHM++ rigs SMPL-X Gaussian bodies from 8–16 photos; I added a foot lock with two-bone leg IK, chess hand poses, SyncNet lip-sync scoring, blinks and idle animation.',
        'The GPU job scripts that ran the avatar pipeline.',
      ],
      bulletsTitle: 'My part',
      media: [
        { type: 'video', src: 'assets/media/lucid-views.mp4', poster: 'assets/media/poster-lucid-views.jpg', caption: 'One dance clip becomes 48 generated views (clip: Antoni Shkraba, Pexels)', card: true, ar: '1920 / 654' },
        { type: 'image', src: 'assets/media/lucid-real.jpg', caption: 'A real frame of the clip' },
        { type: 'image', src: 'assets/media/lucid-render.jpg', caption: 'The team’s 3D reconstruction, rendered' },
        { type: 'video', src: 'assets/media/lucid-tennis.mp4', poster: 'assets/media/poster-lucid-tennis.jpg', caption: 'Play: tennis against an AI opponent with Roger Federer’s likeness. Not affiliated.' },
        { type: 'video', src: 'assets/media/lucid-chess.mp4', poster: 'assets/media/poster-lucid-chess.jpg', caption: 'Play: chess against Stockfish at a legend’s peak rating. Not affiliated.' },
      ],
      links: [
        { label: 'Devpost', href: 'https://devpost.com/software/lucid-dreams-j1ycoi' },
        { label: 'Website', href: 'https://getluciddreams.vercel.app' },
        { label: 'Repository', href: 'https://github.com/OjasMishra32/lucid_dreams' },
      ],
    },
    {
      id: 'sixthsense',
      title: 'Sixth Sense',
      kicker: 'Assistive iOS app · Congressional App Challenge, 3rd place',
      period: 'Sep 2023 — Jun 2025',
      year: '2023',
      summary: 'An iOS navigation aid for blind and low-vision users: on-device obstacle detection, distance from a single camera, and spoken AR routes. 3rd place, 2024 Congressional App Challenge.',
      metric: { display: '15 fps', label: 'YOLOv8n on iPhone 14 Pro' },
      metrics: [
        { value: '15 fps', label: 'YOLOv8n on iPhone 14 Pro' },
        { value: '12.7 MB', label: 'Core ML model, fully on device' },
        { value: '21', label: 'classes in the reference-size table' },
        { value: '3rd', label: 'Congressional App Challenge, 2024' },
      ],
      stack: ['Swift', 'Core ML', 'YOLOv8', 'ARKit', 'OpenCV'],
      results: [
        '**15 fps** sustained detection on an iPhone 14 Pro',
        '**12.7 MB** YOLOv8n Core ML model, running fully on device',
        'Distance from a single camera: pinhole geometry over a **21-class** reference-size table',
        '**3rd place**, 2024 Congressional App Challenge',
        'Requirements scoped with the City of Tampa ADA coordinator',
      ],
      bullets: [
        'Built an assistive navigation iOS app for blind and low-vision users, running a 12.7 MB YOLOv8n Core ML detector at a sustained 15 fps on iPhone 14 Pro.',
        'Modeled obstacle distance with no depth sensor, applying monocular pinhole geometry to a 21-class reference-size table and Kalman-filtering the mean of width-, height-, and area-derived estimates.',
        'Recorded indoor routes with 6-DoF ARKit tracking, with spoken turn-by-turn directions, and scoped accessibility requirements with the City of Tampa ADA coordinator.',
        'The October 2024 demo build was voice-controlled (you start a route by saying it). That build’s source wasn’t kept, so the public repository has the spoken output but not the voice input.',
      ],
      media: [
        { type: 'image', src: 'assets/media/detection-dark.jpg', caption: 'Obstacle detection with distance estimates', portrait: true },
        { type: 'image', src: 'assets/media/detection-indoor.jpg', caption: 'Indoor detection', portrait: true },
        { type: 'image', src: 'assets/media/navigation.jpg', caption: 'Turn-by-turn navigation', portrait: true },
        { type: 'image', src: 'assets/media/mapping.jpg', caption: 'Recording a route with ARKit', portrait: true },
      ],
      links: [
        { label: 'Repository', href: 'https://github.com/vishal-naveen/Sixth-Sense' },
      ],
    },
    {
      id: 'decode',
      title: 'Midnight · DECODE',
      kicker: 'FTC 26588 competition code',
      period: '2025 — 2026',
      year: '2025',
      summary: 'Competition robot code for the 2025–26 FTC season: a flywheel shooter with Limelight targeting and six autonomous routines. Innovate Award.',
      metric: { display: '6', label: 'autonomous routines, 0 to 18 artifacts' },
      metrics: [
        { value: '6', label: 'autonomous routines, 0 to 18 artifacts' },
        { value: '12', label: 'tuning opmodes' },
        { value: '1st', label: 'FTC Innovate Award, 2026' },
      ],
      stack: ['Java', 'Limelight', 'Pedro Pathing', 'FTC SDK'],
      results: [
        'Six autonomous routines, scoring from **0** to **18** artifacts',
        'Flywheel shooter aimed with Limelight vision',
        'Twelve tuning opmodes for the shooter and drivetrain',
        'FTC Innovate Award, **1st place** (2026)',
      ],
      bullets: [
        'Flywheel shooter with Limelight vision targeting.',
        'Six autonomous routines scoring from 0 to 18 artifacts, plus twelve tuning opmodes.',
        'Team won the FTC Innovate Award (1st place, 2026).',
      ],
      media: [],
      links: [
        { label: 'Repository', href: 'https://github.com/vishal-naveen/Midnight_Decode' },
      ],
    },
    {
      id: 'intothedeep',
      title: 'Midnight · Into the Deep',
      kicker: 'FTC 26588 competition code',
      period: '2024 — 2025',
      year: '2024',
      summary: 'Competition robot code for the 2024–25 FTC season: a 105-point, five-specimen autonomous on Pedro Pathing that set the state record and tied the world record at the time.',
      metric: { display: '105', label: 'point autonomous, a state record' },
      metrics: [
        { value: '105', label: 'point autonomous, a state record' },
        { value: 'Tied', label: 'world record at the time' },
        { value: '0.8 s', label: 'intake-to-outtake transfer' },
        { value: 'Finalist', label: 'Florida Championship' },
      ],
      stack: ['Java', 'Pedro Pathing', 'FTC SDK'],
      results: [
        '**105**-point five-specimen autonomous on Pedro Pathing: the state record, and tied for the world record at the time',
        '**0.8 s** intake-to-outtake transfer',
        'Florida Championship finalist',
      ],
      bullets: [
        'Five-specimen autonomous on Pedro Pathing that scored 105 points: the state record, and tied for the world record at the time.',
        '0.8-second intake-to-outtake transfer.',
        'Florida Championship finalist.',
      ],
      media: [],
      links: [
        { label: 'Repository', href: 'https://github.com/vishal-naveen/Midnight_IntoTheDeep' },
      ],
    },
    {
      id: 'ldpc',
      title: 'RL LDPC Decoding',
      kicker: 'Coding theory research · USF',
      period: 'Dec 2024 — Jan 2026',
      year: '2024',
      summary: 'A deep Q-network that decodes LDPC error-correcting codes, the family used in 5G and Wi-Fi, by choosing bit flips. Benchmarked against greedy bit-flipping and BP+LSD across 270 seeded trials.',
      metric: { display: '1,100×', label: 'faster evaluation' },
      metrics: [
        { value: '1,100×', label: 'faster evaluation' },
        { value: '270', label: 'seeded trials per decoder' },
        { value: '3,600', label: 'trial parameter sweep' },
      ],
      stack: ['Python', 'stable-baselines3', 'PyTorch', 'NumPy', 'Coding theory'],
      results: [
        'Evaluation time: **103 min → 5.4 s**, a **1,100×** speedup',
        'Syndrome success: DQN **25.9%** vs greedy bit-flipping **93.7%**, a gap traced to the parity-check matrix rather than the policy',
        '**270** seeded trials per decoder; **810** trial records and a **3,600**-trial sweep published with verification scripts',
      ],
      bullets: [
        'Built a deep Q-network bit-flipping decoder for LDPC codes in stable-baselines3, training the agent to select bit flips from syndrome state and benchmarking it against greedy bit-flipping and BP+LSD baselines across 270 seeded trials.',
        'Traced a 25.9% versus 93.7% syndrome-success gap behind greedy bit-flipping to the parity-check matrix, not the policy.',
        'Reduced evaluation from 103 minutes to 5.4 seconds, a 1,100× speedup, via model caching, feasibility gating, and parallelization.',
        "Open-sourced the study as the project's only pre-college researcher: 810 trial records, a 3,600-trial sweep, and verification scripts.",
      ],
      media: [
        { type: 'image', src: 'assets/media/ldpc-decoder-comparison.png', caption: 'Decoder comparison across seeded trials' },
      ],
      links: [
        { label: 'Repository', href: 'https://github.com/vishal-naveen/rl-ldpc-decoding' },
      ],
    },
  ],

  // Robotics and embedded first. `top` bullets are always shown; `more` opens under "Details".
  experience: [
    {
      id: 'gms',
      org: 'Gator Motorsports',
      context: 'Formula SAE racing team, University of Florida',
      role: 'Firmware Engineer',
      period: 'Aug 2026 — Present',
      location: 'Gainesville, FL',
      summary: 'I built the car’s real-time telemetry system in Rust: bare-metal firmware on a dual-core NXP microcontroller that streams live sensor data over 1 Gbps Ethernet to a multithreaded server.',
      top: [
        'Streams live sensor data at 10 Hz (every 100 ms) using under 0.001% of link capacity (~25 B × 10/s ≈ 2 kbps of 1 Gbps), with headroom for hundreds of signals.',
        'Brought up a complete 3-layer networking stack: the Ethernet MAC driver, a PHY configured over MDIO for 1000BASE-T full duplex, and an async IPv4/UDP stack (embassy-net) on a static /24 subnet, running as a background task.',
        'The whole codec is no_std, so one shared implementation runs on both the microcontroller and the server, with no duplicated protocol logic.',
      ],
      more: [
        'Engineered a full-stack, real-time telemetry system in Rust: bare-metal firmware on an NXP i.MX RT1176 (1 GHz Arm Cortex-M7 + 400 MHz Cortex-M4) and a multithreaded host ingestion server, linked over 1 Gbps Ethernet.',
        'Wire protocol: a compact binary format with 16 bytes of fixed overhead per sample, encoding typed i32, f32 and boolean signals as little-endian fields with a length-prefixed UTF-8 signal name, for 25-byte payloads on live readings.',
        'Fallible, zero-panic decoder that rejects truncated or malformed packets through Rust’s Result type; byte-exact output is validated with unit tests.',
        'no_std drivers (no OS, no standard library) read the chip’s on-die temperature sensor through memory-mapped I/O registers, worked out directly from its reference manual.',
        'Re-architected the driver from blocking polling to interrupt-driven async with Embassy semaphores, so the CPU runs other tasks instead of busy-waiting.',
        'The server splits network receive from decoding and logging across 2 threads with a channel-based producer/consumer design, so processing never blocks packet intake.',
        'Mirrors the Ethernet architecture of the car’s vehicle control and battery control units.',
      ],
      // The architecture strip in the row's details. Every label is a fact from the bullets above.
      diagram: {
        nodes: [
          { title: 'Firmware', sub: 'NXP i.MX RT1176', lines: ['Cortex-M7 @ 1 GHz + Cortex-M4 @ 400 MHz', 'Rust, no_std, Embassy async', 'MAC → PHY (MDIO, 1000BASE-T) → UDP'] },
          { title: 'Host server', sub: 'Rust, multithreaded', lines: ['Thread 1: receive packets', 'Channel (producer → consumer)', 'Thread 2: decode and log'] },
        ],
        link: ['1 Gbps Ethernet', '10 Hz, 25-byte payloads'],
        caption: 'One no_std codec runs on both ends.',
      },
      stack: ['Rust', 'no_std', 'Embassy', 'embassy-net', 'ARM Cortex-M7/M4', 'MMIO', 'Interrupts', 'Ethernet MAC/PHY', 'MDIO', 'UDP', 'Multithreading'],
    },
    {
      id: 'tea',
      org: 'TEA Lab, University of Florida',
      context: 'Trustworthy Engineered Autonomy Lab · Advisor: Dr. Ivan Ruchkin',
      role: 'Undergraduate Researcher',
      period: 'Oct 2026 — Present',
      location: 'Gainesville, FL',
      summary: 'Research on certified, uncertainty-aware 3D perception for self-driving cars: a framework that sorts every perception output into certified, budgeted or withheld trust levels, with statistical guarantees.',
      top: [
        'Trained 32 multi-task ResNet-18 perception models (4 output heads) on 342K Waymo Open Dataset training images, using ~120 NVIDIA B200 GPU-hours on UF’s HiPerGator supercomputer.',
        'Ran a 27-configuration (3×3×3) factorial study of a 4-term multi-task loss, plus a 12-run one-factor sweep, comparing 41 configurations across 4 metrics. Reusing 7 already-trained models cut 27 runs to 20, saving ~26% of compute (~25 GPU-hours).',
        'Cut validation position error (RMSE) by up to 8% over the baseline (5.87 → 5.40 m) while keeping failure detection on par. One run per setting on validation data; a multi-seed check is in progress.',
      ],
      more: [
        'The four loss terms: likelihood, weather invariance, failure probability and error magnitude.',
        'Found that a higher error-head weight lowered RMSE in 7 of 9 controlled comparisons, a direction the one-factor sweep missed. The lab commissioned follow-up runs at r = 7 and 10.',
        'Mapped the accuracy–reliability trade-off: failure-detection AUROC up to 0.87 and error-ranking correlation up 55% (Spearman 0.50 → 0.78), at a measured cost of up to 1.7 m RMSE. The detector matched but rarely beat the model’s built-in uncertainty baseline (5 of 27 configs, by ≤ 0.005).',
        'Ran training 3.5× in parallel with Slurm job arrays under the lab’s shared 96-CPU, 24-GPU limit, finishing a 73 GPU-hour grid in about 21 hours of wall-clock time.',
        'Built an automated evaluation pipeline that generates 41-row comparison tables straight from training logs, using validation data only, to protect the held-out calibration set behind the framework’s statistical guarantees.',
        'Data: the Waymo Open Dataset (486K images, 243K vehicle crops). The dataset config has 8 weather conditions; training used 2 (clear, rain).',
      ],
      note: 'Lab research: no public code or data.',
      stack: ['PyTorch', 'Multi-task learning', 'Uncertainty quantification', 'Slurm / HPC (B200 GPUs)', 'Experiment design', 'Python', 'Git'],
    },
    {
      id: 'ftl',
      org: 'Flash Translation Layer Project',
      context: '6-engineer team',
      role: 'Software Engineer',
      period: 'Sep 2026 — Present',
      location: 'Gainesville, FL',
      summary: 'The software that makes a raw flash chip behave like a disk, written in C++17 with a 6-engineer team.',
      top: [
        'Built a page-mapped flash translation layer in C++17 for a 1 Gb Winbond SPI NAND chip (1,024 × 128 KB erase blocks), handling out-of-place writes, in-order page programming and factory bad-block skipping.',
        'Implemented greedy garbage collection with a 3-block over-provisioning reserve, O(1) reverse-map fixups and ECC-safe spare-area copying, sustaining 100K+ writes on a 2,048-page emulated chip.',
        'Built a seeded differential test harness that replays 100K random operations against a reference model across ~25 full device fills, with zero divergence.',
      ],
      more: [
        'Shipped 38 GoogleTest tests through CI-gated pull requests, and taught the team the chip’s SPI command protocol.',
      ],
      stack: ['C++17', 'CMake', 'GoogleTest', 'CI'],
    },
    {
      id: 'pedro',
      org: 'Pedro Pathing',
      context: 'Open-source robotics library',
      role: 'Algorithm Developer & Beta Tester',
      period: 'Jun 2025 — Jan 2026',
      location: 'Remote',
      summary: 'Path following for an open-source autonomous navigation library used by 2,500+ FTC teams.',
      top: [
        'Implemented path following over multi-order Bézier curves in Java, tuning velocity profiling and PID heading correction.',
        'Tested pre-release builds of an autonomous navigation library used by 2,500+ FTC teams, documenting pathing regressions.',
      ],
      more: [],
      stack: ['Java', 'Bézier curves', 'PID control'],
    },
    {
      id: 'usf',
      org: 'University of South Florida',
      context: 'Coding theory & reinforcement learning',
      role: 'Student Researcher',
      period: 'Dec 2024 — Jan 2026',
      location: 'Tampa, FL',
      summary: 'A reinforcement-learning decoder for LDPC error-correcting codes, the family used in 5G and Wi-Fi.',
      top: [
        'Built a deep Q-network bit-flipping decoder for LDPC codes and benchmarked it against greedy bit-flipping and BP+LSD across 270 seeded trials.',
        'Reduced evaluation from 103 minutes to 5.4 seconds, a 1,100× speedup, via model caching, feasibility gating, and parallelization.',
      ],
      more: [
        'Traced a 25.9% versus 93.7% syndrome-success gap to the parity-check matrix, not the policy.',
        "Open-sourced the study as the project's only pre-college researcher.",
      ],
      stack: ['Python', 'stable-baselines3', 'DQN'],
      link: '#work/ldpc',
    },
    {
      id: 'inctoinc',
      org: 'Inc to Inc',
      context: 'Production web development',
      role: 'Software Developer',
      period: 'Jun 2023 — Jul 2025',
      location: 'Tampa, FL',
      summary: 'Production websites for two Tampa nonprofits, built with one other developer.',
      top: [
        'Developed 3 production websites with one other developer for STEAMA and Tampa Youth Basketball Association.',
        'Shipped session authentication, class scheduling, PayPal payment and donation flows, and storefronts on a relational SQL schema.',
      ],
      more: [],
      stack: ['JavaScript', 'SQL', 'Node.js', 'PayPal'],
    },
  ],

  leadership: {
    org: 'Middleton Robotics',
    role: 'FTC Team Captain & Lead Programmer',
    teams: 'Teams 4997 and 26588',
    period: 'Aug 2023 — May 2026',
    location: 'Tampa, FL',
    highlights: [
      { display: '1st', label: 'state title in 7 years' },
      { display: '105', label: 'pt auto: state record, tied world record' },
      { display: '$33,000', label: 'raised as captain' },
      { display: '15', label: 'member team led' },
      { display: '15', label: 'outreach events & workshops' },
    ],
    bullets: [
      'Led a 15-member team to its first state title in 7 years, and programmed a 105-point five-specimen autonomous routine (2024–25): a state record that tied the world record at the time.',
      'Raised $33,000 as captain and organized 15 outreach events and technical workshops.',
      'Owned the team codebase on GitHub and ran build-season sprint planning across the mechanical and software subteams.',
    ],
  },

  awards: [
    { year: '2026', title: 'SwampHacks XII, Best Overall', place: '3rd of 141', org: 'Zer0Sh0t, team of 4' },
    { year: '2026', title: 'Gator Hack V (UF AI Days)', place: 'Top 10', org: 'Lucid Dreams, team of 4' },
    { year: '2026', title: 'Innovate Award', place: '1st Place', org: 'FIRST Tech Challenge' },
    { year: '2025', title: 'Inspire Award', place: '2nd Place', org: 'FIRST Tech Challenge' },
    { year: '2025', title: 'State Finalist & Alliance Captain', place: 'Finalist', org: 'FIRST Tech Challenge' },
    { year: '2025', title: 'FRC Rising All-Star Award', place: 'World Championship', org: 'FIRST Robotics Competition' },
    { year: '2024', title: 'Congressional App Challenge', place: '3rd Place', org: 'Sixth Sense · U.S. House of Representatives' },
  ],

  activities: [
    { title: 'Co-founded a VEX robotics camp', detail: 'Taught C++ to 12 under-resourced middle schoolers, who formed 2 competitive teams.', period: '2024 — 2025' },
    { title: 'Programmer, FRC Team 1369', detail: 'Programmed through a FIRST World Championship season.', period: '2025' },
    { title: "Mayor's Youth Corps", detail: '1 of 40 selected citywide.', period: 'Tampa' },
  ],

  // The full, readable skills list under the 3D board (the board shows a curated 19).
  skills: [
    { id: 'embedded', label: 'Embedded & firmware', items: ['Rust', 'no_std', 'Embassy', 'embassy-net', 'ARM Cortex-M7/M4', 'MMIO', 'Interrupts', 'Ethernet MAC/PHY', 'MDIO', 'UDP', 'Multithreading'] },
    { id: 'robotics', label: 'Robotics & controls', items: ['Imitation learning', 'Teleoperation', 'Inverse kinematics', 'PID control', 'Bézier path planning', 'Reinforcement learning (DQN)', 'CAD'] },
    { id: 'ml', label: 'ML & research', items: ['PyTorch', 'Multi-task learning', 'Uncertainty quantification', 'Experiment design', 'Slurm / HPC (B200 GPUs)', 'LeRobot', 'ACT', 'SmolVLA', 'stable-baselines3', 'Hugging Face', 'YOLOv8', 'Core ML', 'OpenCV', 'NumPy'] },
    { id: 'languages', label: 'Languages', items: ['Python', 'C++17', 'Rust', 'Java', 'Swift', 'TypeScript', 'JavaScript', 'SQL'] },
    { id: 'tools', label: 'Tools & web', items: ['Git', 'GitHub', 'CI/CD (GitHub Actions)', 'CMake', 'GoogleTest', 'Linux', 'three.js', 'WebXR', 'ARKit', 'Xcode', 'Android Studio', 'Jupyter', 'React', 'Node.js', 'REST APIs'] },
  ],

  // Things that are true right now (fall 2026).
  now: [
    'Freshman in Electrical Engineering at UF, Honors Program',
    "Firmware engineer on Gator Motorsports' Rust telemetry system",
    'Undergraduate researcher in the TEA Lab: certified 3D perception for self-driving cars',
    'Building a flash translation layer in C++17 with a 6-engineer team',
  ],

  // Keywords for marquees and tickers.
  keywords: ['Robotics', 'Embedded Rust', 'Imitation Learning', 'Perception', 'Uncertainty Quantification', 'Control Systems', 'Path Planning', 'Computer Vision', 'PyTorch', 'Open Source'],

  nav: [
    { id: 'experience', label: 'Experience' },
    { id: 'lab', label: 'Work' },
    { id: 'leadership', label: 'Leadership' },
    { id: 'stack', label: 'Stack' },
    { id: 'contact', label: 'Contact' },
  ],
};
