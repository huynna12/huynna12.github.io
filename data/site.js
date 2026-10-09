// All site content lives here. Edit this file; no layout code needs to change.
// Anything marked TODO is a fact I still need.
const SITE = {
  name: "Huynh Ho",
  preferredName: "Heidi",
  tagline: "CS and Math double major, minor in Data Science.",
  seeking: "Open to new grad 2027 roles.",
  // Shown as "At a glance" under the hero.
  sheet: [
    { k: "From", v: "Ho Chi Minh City, Vietnam" },
    { k: "Based in", v: "Gettysburg, PA" },
    { k: "Works in", v: "Go, Python" },
    { k: "Target roles", v: "Backend, Infrastructure, SWE" },
    { k: "Fuel", v: "Vietnamese iced coffee" }
  ],

  links: {
    github: "https://github.com/huynna12",
    linkedin: "https://linkedin.com/in/heidi-ho-16b875246",
    email: "honhuhuynh1210@gmail.com",
    resume: "Huynh_Ho_Resume.pdf"
  },

  openSource: [
    {
      repo: "Kerno",
      repoUrl: "https://github.com/optiqor/kerno",
      blurb: "Kubernetes observability tool written in Go. Contributed through GirlScript Summer of Code.",
      prs: [
        { number: 110, url: "https://github.com/optiqor/kerno/pull/110", merged: "Jun 4, 2026" }
      ],
      summary: "feat(adapter): replace kubelet HTTP polling with SharedIndexInformer",
      diagram: {
        title: "How the fix works",
        rows: [
          { label: "Before", tone: "before", steps: ["Poll kubelet over HTTP", "Pod tracking silently stops on GKE and EKS"] },
          { label: "After", tone: "after", steps: ["SharedIndexInformer (local node only)", "Two in-memory indexes", "O(1) pod lookups"] },
          { label: "On failure", steps: ["API server error", "Exponential backoff, 1s to 2 min", "Keep stale entries, degraded mode"] }
        ]
      },
      bullets: [
        "Replaced kubelet HTTP polling with a Kubernetes SharedIndexInformer scoped to the local node. This fixed pod tracking that silently stopped on GKE and EKS clusters after startup.",
        "Added two in-memory indexes, which cut pod lookups from O(n) to O(1).",
        "Added exponential backoff (1s to 2 min) for API server failures, and kept stale entries so pod enrichment keeps working in a degraded mode."
      ]
    },
    {
      repo: "Tether",
      repoUrl: "https://github.com/FastCrest/tether",
      blurb: "Edge-to-cloud AI deployment CLI with 83+ stars.",
      prs: [
        {
          number: 220, url: "https://github.com/FastCrest/tether/pull/220", merged: "Jun 17, 2026",
          title: "feat(api): add X-Reflex-Request-ID header middleware",
          text: "Built request-ID middleware that stamps every API response with a UUID, so one request can be traced across a fleet. Merged after code review, with 5 unit tests."
        },
        {
          number: 258, url: "https://github.com/FastCrest/tether/pull/258", merged: "Aug 28, 2026",
          title: "Fix/episode cache bytes metric wiring",
          text: "Restored a Prometheus metric that never emitted in production and fixed a double-counting bug."
        },
        {
          number: 304, url: "https://github.com/FastCrest/tether/pull/304", merged: "Aug 28, 2026",
          title: "fix(runtime): flush recorder queue when the process exits",
          text: "Fixed silent data loss on unclean shutdown by flushing pending writes at exit, with 6 tests."
        }
      ],
      // Only what the three merged PRs did. Add rows here as more PRs land.
      diagram: {
        title: "Before and after my changes",
        rows: [
          { heading: "#220 Tracing" },
          { label: "Before", tone: "before", steps: ["Responses carry no request ID", "Can't follow one request across a fleet"] },
          { label: "After", tone: "after", steps: ["Middleware stamps a UUID on every response", "One request can be traced across a fleet"] },
          { heading: "#258 Metrics" },
          { label: "Before", tone: "before", steps: ["Episode cache bytes metric never emitted in production", "Plus a double-counting bug"] },
          { label: "After", tone: "after", steps: ["Metric wired up and emits in production", "Counted once"] },
          { heading: "#304 Shutdown" },
          { label: "Before", tone: "before", steps: ["Process exits uncleanly", "Pending writes lost, silently"] },
          { label: "After", tone: "after", steps: ["Recorder queue flushed at exit", "No silent data loss"] }
        ]
      }
    }
  ],

  projects: [
    {
      name: "model-operator",
      status: "In progress",
      purpose: "A Go Kubernetes controller that deploys and manages model-serving workloads from a ModelDeployment custom resource.",
      tags: ["Go", "Kubernetes"],
      // TODO: add bullets, tests and results here only once they are finished and tested.
      bullets: [],
      // TODO: the repo returned 404 when I checked. Add the link once it is public.
      links: []
    },
    {
      name: "YouLecture: AI Study Environment",
      purpose: "Turns a YouTube URL into an outline, summaries, and flashcards.",
      shot: { src: "assets/youlecture.png", alt: "Screenshot of the YouLecture home page with a box to paste a YouTube lecture URL.", w: 960, h: 600, url: "http://3.217.194.27", caption: "The live app. Open it to try it." },
      diagram: {
        title: "How it works",
        rows: [
          { steps: ["YouTube URL", "Transcript (cached)", "5-agent RAG pipeline (slow stages run in parallel)", "Outline, summaries, flashcards"] }
        ]
      },
      tags: ["Python", "FastAPI", "Claude API", "Next.js", "AWS", "Docker", "nginx"],
      bullets: [
        "A 5-agent RAG pipeline. Deployed on AWS Lightsail with Docker and nginx.",
        "Parallelized slow stages and cached transcripts.",
        "Fixed YouTube HTTP 429 rate limiting on AWS with a rotating residential proxy."
      ],
      links: [
        { label: "GitHub", url: "https://github.com/huynna12/your-lecture-but-better" },
        { label: "Live demo", url: "http://3.217.194.27", note: "runs over HTTP" }
      ]
    },
    {
      name: "Cancer to Hell: Clinical Research Tool",
      purpose: "Helps patients and oncologists explore treatment evidence.",
      shot: { src: "assets/cancer-to-hell.png", alt: "Screenshot of the Cancer to Hell patient profile form.", w: 960, h: 600, url: "http://3.217.194.27:8090", caption: "The live app. Synthetic patient data only." },
      diagram: {
        title: "How it works",
        rows: [
          { steps: ["Patient profile", { parallel: ["Evidence agent", "Guideline agent", "Risk agent"] }, "Citation check against live PubMed", "Results stream to the browser (SSE)"] }
        ]
      },
      tags: ["Go", "Anthropic Claude", "PubMed", "Next.js", "SSE", "Docker Compose", "AWS"],
      bullets: [
        "Three LLM agents (evidence, guideline, risk) run concurrently as Go goroutines and stream results over server-sent events.",
        "A guardrail checks each citation against live PubMed.",
        "Deployed on AWS Lightsail with Docker Compose."
      ],
      links: [
        { label: "GitHub", url: "https://github.com/huynna12/cancer-to-hell" },
        { label: "Live demo", url: "http://3.217.194.27:8090", note: "runs over HTTP" }
      ]
    },
    {
      name: "Line-Following Robot (PicarX)",
      purpose: "A small robot that follows a line using grayscale sensors. 2025.",
      tags: ["Python", "Grayscale sensors", "State machine"],
      bullets: [
        "Led a student team.",
        "Tuned sensor thresholds for different lighting.",
        "Added recovery logic to find the line again."
      ],
      links: [
        { label: "GitHub", url: "https://github.com/huynna12/robot-path" }
      ]
    }
  ],

  skills: [
    { group: "Languages", items: ["Go", "Python", "Java", "JavaScript/TypeScript"] },
    { group: "Infrastructure", items: ["Kubernetes", "Docker", "AWS (EC2, Lightsail)", "Linux", "nginx", "Git"] },
    { group: "Backend and Observability", items: ["REST API design", "FastAPI", "Prometheus metrics", "MySQL"] },
    { group: "AI", items: ["Claude API", "RAG", "Multi-agent pipelines", "Claude Code"] }
  ],

  education: {
    school: "Gettysburg College",
    degree: "B.S. in Computer Science and Mathematics, minor in Data Science",
    detail: "GPA 3.71. Expected graduation May 2027.",
    coursework: ["Operating Systems", "Data Structures and Algorithms", "Database Systems", "AI", "Probability and Statistics"]
  },

  experience: [
    {
      role: "Open Source Contributor",
      where: "Kerno and Tether",
      when: "Apr 2026 to present",
      text: "Merged pull requests in Go and Kubernetes tooling. Details above."
    },
    {
      role: "Teaching Assistant, Calculus I",
      where: "Gettysburg College",
      when: "Aug to Dec 2024",
      text: "Led weekly problem-solving sessions for about 30 students and told the professor which topics they struggled with."
    }
  ],

  outsideWork: [
    { text: "Run a half marathon", done: true },
    { text: "Run a full marathon this year" },
    { text: "Learn sign language" },
    { text: "Travel" },
    { text: "Save the world" }
  ],
  alwaysOn: "Vietnamese iced coffee. Long runs. League of Legends."
};
