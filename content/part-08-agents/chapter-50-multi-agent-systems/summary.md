Chapter 50 covers how several large language model (LLM) agents are wired together and what each wiring costs. Lesson 50.1 counts links, hops and messages for supervisor, hierarchical and peer-to-peer topologies, and shows that majority voting gains less than it seems when agents make correlated mistakes. Lesson 50.2 gives messages a type and a legal order (the contract net protocol), counts its messages, and works out how many faulty agents a quorum rule tolerates for crash and Byzantine faults. Lesson 50.3 measures the prompt-word cost of CrewAI and AutoGen team patterns with a stub model, and notes that AutoGen is archived. Every count in the chapter measures structure, not answer quality.

## Key ideas

- A topology is the graph of allowed messages: a star and a tree on $n$ agents have $n - 1$ links, and a complete graph has $\binom{n}{2}$.
- Removing the hub of a star disconnects every pair of workers; a complete graph keeps every surviving pair connected.
- Messages per task: $2k$ for a supervisor with $k$ subtasks, and $R\,n(n-1)$ for a debate of $n$ agents over $R$ rounds.
- A majority vote of three independent agents, each wrong with probability 0.3, is wrong 0.216 of the time, against 0.300 for one agent.
- With error correlation $\rho$, a vote's error is $\rho p + (1-\rho)M$, where $M$ is the independent majority error, so shared mistakes cap the gain.
- A contract net round costs $3N$ point-to-point messages; an all-to-all round costs $N(N-1)$.
- Crash-fault agreement needs $n \ge 2f+1$ with majority quorums; Byzantine agreement needs $n \ge 3f+1$ and quorums of size $\lceil (n+f+1)/2 \rceil$.
- Majority-vote accuracy at $p = 0.7$ with $\rho = 0.3$ tends to $0.91$ as the panel grows, however many agents join.
- In a sequential crew, a task receives only the previous output unless `context` lists more tasks, and hierarchical reviews re-send each output they judge.
- A round-robin group chat re-sends its whole history every turn, so its total prompt words grow quadratically with length; a model-based selector adds one call per turn.
- AutoGen's repository is archived; check Microsoft Agent Framework before starting a new project.

## Before moving on

- [ ] I can count the links and the messages per task for a star, a tree or a complete graph of $n$ agents.
- [ ] I can compute, by hand, the share of surviving agent pairs after the hub or root is removed.
- [ ] I can compute the majority-vote error for three or five agents, with and without correlation $\rho$.
- [ ] I can apply $n \ge 2f+1$ and $n \ge 3f+1$ and find the quorum size for a given $n$ and $f$.
- [ ] I can estimate prompt words for a sequential, hierarchical or group-chat run using the counting rules in Lesson 50.3.
- [ ] I can state why a stop rule or a message cap is needed in a group chat.
- [ ] I check a framework's maintenance status before choosing it.
