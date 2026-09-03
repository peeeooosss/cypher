import type { GuideTab } from "@/components/step-guide";

export const organizerGuideTabs: GuideTab[] = [
  {
    id: "signup",
    label: "Sign up",
    steps: [
      {
        title: "Open the sign-up page",
        text: "Go to /signup to create an account.",
      },
      {
        title: "Choose Organizer",
        text: "Select the Organizer tab on the account-type selector so the name field becomes your organization name.",
      },
      {
        title: "Enter your details",
        text: "Fill in Organization name, username, email, and a password (8+ characters), then confirm the password.",
      },
      {
        title: "Verify your email",
        text: "Click Verify email next to the email field, open the 6-digit code sent to your inbox, enter it, and click Verify code. The button changes to Verified ✓.",
      },
      {
        title: "Create your account",
        text: "Click Create account. Once the success panel appears, click Sign in, log in, and you land on your organizer dashboard at /organizer.",
      },
    ],
    note: "Your email must be verified before you can create the account.",
  },
  {
    id: "logo",
    label: "Studio logo",
    steps: [
      {
        title: "Open Studio profile",
        text: "On /organizer, scroll to the Studio profile panel.",
      },
      {
        title: "Upload your logo",
        text: "Click Upload logo and pick a JPG, PNG, or WebP image. The logo is saved automatically the moment it uploads — you don't need to wait for the Save button.",
      },
      {
        title: "Add your details",
        text: "Optionally set Studio name and Founded year, then click Save studio profile. You can Change or Remove the logo anytime.",
      },
    ],
  },
  {
    id: "create-event",
    label: "Create event",
    steps: [
      {
        title: "Open Create event",
        text: "On the dashboard /organizer, scroll to the Create event panel.",
      },
      {
        title: "Fill in the basics",
        text: "Enter an event title, a URL slug (e.g. your-event), and pick an Event type (Underground battle, Dance competition, Music competition, or Workshop).",
      },
      {
        title: "Set the location & time",
        text: "Choose the state and city, add the venue, paste the Google Maps link, and set the start date and time.",
      },
      {
        title: "Add a description & poster",
        text: "Write the description shown on the public event page and upload a poster image (JPG/PNG/WebP up to 1.5MB).",
      },
      {
        title: "Create & pay the flat fee",
        text: "Click Create event & pay flat fee. You're taken to the billing page for the flat posting fee. The event is created as a Draft.",
      },
    ],
  },
  {
    id: "categories",
    label: "Categories",
    steps: [
      {
        title: "Open the event dashboard",
        text: "From /organizer, click Manage event on your event, or open the Categories tab on /organizer/{eventId}.",
      },
      {
        title: "Add a category",
        text: "Click + Add category (or quick-add from the dashboard). Enter the category name and choose its format.",
      },
      {
        title: "Set limits and fees",
        text: "Optionally set the maximum participants and the entry fee (₹).",
      },
      {
        title: "Add a prize pool (optional)",
        text: "Enter a prize pool amount — this auto-creates a 60/30/10 prize split you can edit later in the Prizes tab. Click Create to finish.",
      },
    ],
    note: "Competitions auto-create two default phases (Qualifiers and Finals). Format is limited to what your event type supports.",
  },
  {
    id: "phases",
    label: "Phases / rounds",
    steps: [
      {
        title: "Open Round phases",
        text: "In the Categories tab, each category has a Round phases list and an + Add round phase button.",
      },
      {
        title: "Add a round",
        text: "Choose the round type (Cypher, Qualifier, Battle 1v1 / 2v2 / 3v3 / 4v4, Crew vs Crew, Seven-to-Smoke, or Final), and give it a label like Top 16.",
      },
      {
        title: "Configure the round",
        text: "Set the round count, the duration in seconds, and how many entries advance to the next phase. Click Add.",
      },
      {
        title: "Edit or delete later",
        text: "Use Edit phase to change a round, or Delete to remove it. Phases run in order in the Control Room.",
      },
    ],
  },
  {
    id: "judges",
    label: "Judge code & portal",
    steps: [
      {
        title: "Open the Judges tab",
        text: "On the event dashboard, open Judges — there's a code generator for each category.",
      },
      {
        title: "Pick a judge",
        text: "Choose From artist directory (search and select an artist) or Manual name for an outside judge.",
      },
      {
        title: "Generate the code",
        text: "Click + Generate code to create a 6-character code for that judge and category. Use Copy to share it.",
      },
      {
        title: "Judges enter the portal",
        text: "Share the code. The judge opens /judge, types the code, and clicks Enter to reach /judge/{code}.",
      },
      {
        title: "Activate the slot",
        text: "Judges only score when a slot is active. Use Activate / Deactivate on each code in the Judges tab.",
      },
    ],
  },
  {
    id: "leaderboard",
    label: "Leaderboard",
    steps: [
      {
        title: "Open the Leaderboard tab",
        text: "On the event dashboard, open Leaderboard to see live standings for the whole event.",
      },
      {
        title: "Filter the view",
        text: "Use the Format, Category, and Phase filters to zoom into a specific round. Hit Refresh to pull the latest data.",
      },
      {
        title: "Read the standings",
        text: "Cypher / Qualifier rounds rank each entry by judge scores with Advanced / Eliminated badges. Battle rounds show the bracket, vote tallies, winners, and judge feedback.",
      },
    ],
  },
  {
    id: "control-room",
    label: "Control Room",
    steps: [
      {
        title: "Set the event to LIVE",
        text: "In the Overview tab, switch the event status to LIVE. The Control Room is locked until the event is live and the flat fee is paid.",
      },
      {
        title: "Start a phase",
        text: "In Control Room, click Start {Phase} — starting a battle phase automatically generates the bracket from confirmed registrations.",
      },
      {
        title: "Run the battles",
        text: "Click Push live on a match to broadcast it, judges vote, then Lock voting and pick the Winner to complete the match.",
      },
      {
        title: "Advance the bracket",
        text: "When all battles are done, click Advance to next phase (or Back to previous / Reset to Cypher to redo).",
      },
      {
        title: "Advance a cypher",
        text: "For Cypher / Qualifier rounds, tick the entries that move on and click Advance N entries.",
      },
    ],
  },
  {
    id: "prizes",
    label: "Prizes",
    steps: [
      {
        title: "Open the Prizes tab",
        text: "On the event dashboard, open Prizes — each category has its own prize pool section. (Hidden for workshops.)",
      },
      {
        title: "Set the pot",
        text: "Enter the Total amount and choose the currency.",
      },
      {
        title: "Configure the split",
        text: "Use + Add rank to add places like 1st place and set each % share. The percentages must total 100%.",
      },
      {
        title: "Mark it paid",
        text: "Tick the Paid checkbox when you've released the prize, then click Create prize pool or Update prize pool.",
      },
    ],
  },
  {
    id: "gigs",
    label: "Freelance jobs",
    steps: [
      {
        title: "Open your gigs",
        text: "Go to /organizer/gigs (or click Freelance work on your dashboard).",
      },
      {
        title: "Post a gig",
        text: "Click Post gig, enter the title, description, location, date, budget, and currency, and select at least one required skill. Click Post gig.",
      },
      {
        title: "Pay to publish",
        text: "The gig starts as a Draft. Pay the posting fee and click I've paid — send for verification to open it up to artists.",
      },
      {
        title: "Review applicants",
        text: "Each gig lists its applicants with profiles, skills, rates, and availability. Send offer or Reject each pending applicant.",
      },
      {
        title: "Close the deal",
        text: "Send offer sets the fee, work date, scope, deliverables and terms. When the artist accepts and the connection fee is verified, Open chat to talk and Confirm payment sent once you pay.",
      },
    ],
  },
];

export const artistGuideTabs: GuideTab[] = [
  {
    id: "signup",
    label: "Sign up",
    steps: [
      {
        title: "Open the sign-up page",
        text: "Go to /signup to create your artist account.",
      },
      {
        title: "Choose Artist",
        text: "Make sure the Artist tab is selected on the account-type selector.",
      },
      {
        title: "Enter your details",
        text: "Fill in your stage name, username, email, and a password (8+ characters), then confirm the password.",
      },
      {
        title: "Verify your email",
        text: "Click Verify email, enter the 6-digit code from your inbox, and click Verify code. The button changes to Verified ✓.",
      },
      {
        title: "Create your account",
        text: "Click Create account, then Sign in. You land on your artist dashboard at /artist.",
      },
    ],
    note: "Your email must be verified before you can create the account.",
  },
  {
    id: "profile",
    label: "Build profile",
    steps: [
      {
        title: "Open My profile",
        text: "On /artist, scroll to the My profile panel.",
      },
      {
        title: "Add your photo",
        text: "Click Upload photo, pick a JPG/PNG/WebP up to 5MB, or Change / Remove it later.",
      },
      {
        title: "Choose visibility",
        text: "Pick Public (shown in the artist directory for visitors) or Private (hidden from visitors, visible to organizers and artists).",
      },
      {
        title: "Fill in the details",
        text: "Set your name, style, years of experience, crew, city, country, social handle, keywords/tags that help people find you, and referral.",
      },
      {
        title: "Add your skills",
        text: "Toggle the skill tags that describe what you do — these are used for gig matching and directory search.",
      },
      {
        title: "Save",
        text: "Click Save profile. These details go to organizers with every registration.",
      },
    ],
  },
  {
    id: "register",
    label: "Register for events",
    steps: [
      {
        title: "Find an event",
        text: "Browse /events and open an event you want to enter.",
      },
      {
        title: "Start registering",
        text: "Click Register and choose one or more categories — each category is one entry and you pay one combined fee.",
      },
      {
        title: "Teams & crews",
        text: "For team formats you're the captain: give the entry a team/crew name and Search username to add CYPHR members. They'll be invited to confirm after you pay.",
      },
      {
        title: "Continue to payment",
        text: "Review the total and click Continue to payment — ₹{total}.",
      },
    ],
  },
  {
    id: "payments",
    label: "Pay your entry",
    steps: [
      {
        title: "Pay the organizer",
        text: "On the checkout, scan the UPI QR (or use the UPI buttons) and pay the exact total shown to the organizer.",
      },
      {
        title: "Report each category",
        text: "For every category tap I have paid. If team members were invited, they must accept their spot before you can report payment.",
      },
      {
        title: "Send the screenshot",
        text: "Click Send screenshot — this opens WhatsApp with a pre-filled message for CYPHR billing verification.",
      },
      {
        title: "Get confirmed",
        text: "Once the organizer approves, your status changes to Confirmed.",
      },
    ],
  },
  {
    id: "dashboard",
    label: "Your dashboard",
    steps: [
      {
        title: "Check your stats",
        text: "On /artist you'll see events entered, battles won, total battles, and prizes paid / pending.",
      },
      {
        title: "Handle invites",
        text: "Review team invitations and your team entries so you don't miss a call-up.",
      },
      {
        title: "Track enrolled events",
        text: "My enrolled events shows each registration with its payment status — Paid & confirmed, Registered, or Wait for verification — and lets you Go live or complete payment.",
      },
    ],
  },
  {
    id: "live",
    label: "Live scoring & leaderboard",
    steps: [
      {
        title: "Watch your round",
        text: "When your battle goes live, open the event's live page to see your results in real time.",
      },
      {
        title: "Follow the standings",
        text: "The live leaderboard shows your rank — in score-based rounds by judge totals, in battle rounds by the bracket and match results.",
      },
    ],
  },
  {
    id: "gigs",
    label: "Gigs & freelance",
    steps: [
      {
        title: "Open Marketplace",
        text: "Go to /artist/marketplace (or Marketplace / Gigs on your dashboard) to see organizer-posted gigs.",
      },
      {
        title: "Unlock Gig Work",
        text: "If you haven't enabled it, click Unlock Marketplace to apply and pay the flat Gig Work fee — you need it to apply to gigs.",
      },
      {
        title: "Apply to a gig",
        text: "Click Apply to this gig, leave a short note to the organizer (optional), and click Submit proposal.",
      },
      {
        title: "Accept & work",
        text: "If the organizer sends you an offer, review the fee, dates, scope and terms, accept the agreement, chat with the organizer, and get paid.",
      },
    ],
  },
];
