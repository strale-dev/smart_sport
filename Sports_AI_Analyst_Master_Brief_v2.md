# **SPORTS AI ANALYST** 

## **MASTER PRODUCT + TECHNICAL DEVELOPMENT BRIEF** 

_Greenfield / From Zero / Cursor-Ready Specification_ 

#### **Core promise: “I have a football analyst beside me.”** 

This document defines the intended depth of the product, not just the list of pages. 

Sports AI Analyst - Master Brief v2 | Greenfield Specification 

### **0. DOCUMENT PURPOSE** 

This brief describes Sports AI Analyst as a completely new product. It is written so an AI coding agent in Cursor can understand the product vision, the required depth of the data model, the expected behavior of the AI engine, the page-level UX, and the implementation sequence without relying on any previous project state. 

The most important requirement is that the application must distinguish between data retrieval, statistical computation, prediction, AI interpretation, and presentation. The AI must be capable of operating both pre-match and in real time during live matches. 

This document is intentionally detailed. “Build the feature” means build the complete data flow, edge states, UI states, validation, caching, and UX expected by the specification - not a visual placeholder. 

### **1. PRODUCT VISION** 

Sports AI Analyst is a premium football intelligence SaaS product that combines real football data, statistical analysis, predictive modeling, and AI-generated explanations. The product should feel like a serious analytics platform, not a score widget with an AI text box. 

|**Layer**|**Purpose**|**User value**|
|---|---|---|
|Real football data|Fixtures, teams, players, events, statistics,<br>lineups,standings|Trustworthy foundation|
|Analytics|Form, H2H, team strength, player<br>performance,trends|Understand the match|
|Prediction engine|1/X/2 andgoal-relatedprobabilities|Structured forecast|
|AI engine|Explain what the numbers mean|Human-readable intelligence|
|Live intelligence|Recalculate duringthe match|Understand who has momentum and why|
|Personalization|Follow teams/players,favorites,history|Return value|
|Premium|Advanced AI and deeper analytics|Monetizableproduct|



### **2. CORE USER PROMISE** 

The application should answer four questions for a user on any match page: 

**1.** What is happening? - verified match data, score, events and statistics. 

**2.** Who has the advantage? - model-based probabilities and current match state. 

**3.** Why? - key statistical factors and AI explanation. 

**4.** What could happen next? - scenario-based live or pre-match projections, clearly labeled as predictions. 

### **3. PRODUCT PRINCIPLES** 

- Data before narrative: every AI claim must be grounded in available data. 

- Prediction before prose: the statistical engine produces the structured forecast; the LLM explains it. 

- No fake data: no hardcoded form, H2H, lineups, player biographies or statistics in production. 

- Live means live: if a match is in progress, the AI layer must have a path to refresh its context and update its conclusions. 

- Uncertainty is a feature: confidence and data quality should be visible. 

- Premium simplicity: the interface can be deep, but the primary read must remain easy to scan. 

Sports AI Analyst - Master Brief v2 | Greenfield Specification 

- Every important screen has loading, empty, error, stale-data and success states. 

### **4. TARGET USERS** 

- Football fans who want deeper match understanding than a conventional score app. 

- Users interested in predictive analytics and probability-based match views. 

- Users who follow specific teams or players and want a personalized intelligence feed. 

- Advanced users who want statistics, trends and player-level information. 

- Future audiences may include fantasy users, analysts and scouting-oriented users. 

### **5. INITIAL PRODUCT SCOPE** 

Launch with football only. The internal architecture should be sport-extensible, but the first product should prioritize excellent football data coverage and a deep match experience. 

- Dashboard 

- Live Center 

- Match Details 

- Teams/Clubs 

- Players 

- Leagues 

- Predictions 

- Favorites / Follow system 

- Statistics 

- Authentication 

- Premium entitlements 

Sports AI Analyst - Master Brief v2 | Greenfield Specification 

### **6. AI ENGINE - NON-NEGOTIABLE ARCHITECTURE** 

The AI engine is a core system, not an isolated UI card. It must work in two modes: PRE-MATCH and LIVE. The UI should expose different AI outputs depending on match status. 

##### **6.1 Shared pipeline** 

Use the following conceptual pipeline: 

###### **Football provider → normalization → validation → cache/database → feature engineering → prediction engine → AI context builder → LLM → structured insight → UI** 

##### **6.2 Separation of responsibilities** 

|**Subsystem**|**Responsibility**|**Must not do**|
|---|---|---|
|Data layer|Fetch and normalizeprovider data|Generate facts|
|Analytics layer|Compute form, H2H summaries, ratings,<br>trends|Invent missing values|
|Prediction engine|Produce numericalprobabilities/scenarios|Write narrative|
|AI context builder|Select and summarize trusted inputs|Callprovider directlyfrom UI|
|LLM|Explain structured inputs and generate<br>insight|Invent stats or overwrite model outputs|
|UI|Present state clearly|Perform business logic|



##### **6.3 AI output must be structured** 

Do not depend on free-form text as the primary internal contract. The AI response should be validated against a typed schema and contain machine-readable fields. 

|**Field**|**Example**|
|---|---|
|summary|One concise sentence describingcurrent edge|
|advantage|HOME / DRAW / AWAY / EVEN|
|winOutcome|1 / X / 2|
|winProbabilities|home 0.54,draw 0.25,away0.21|
|expectedGoalsRange|e.g. 1-3 totalgoals|
|weakerTeamScoringChance<br>|e.g. 0.42|
|confdence|LOW / MEDIUM / HIGH|
|keyFactors|arrayof evidence-based factors|
|scenarios|best case / likelycase / upset case|
|commentary|human-readable analysis|
|dataTimestamp|timestampused for analysis|
|dataQuality|complete /partial / stale|



### **7. PRE-MATCH AI ENGINE** 

For matches that have not started, the AI context builder should use as much verified historical and contextual information as available. The engine should not simply ask an LLM “who will win?”. 

##### **7.1 Pre-match inputs** 

- Head-to-head history: last N meetings, home/away context, competition context. 

- Recent form: last 5 and last 10 matches, with separate home/away splits where possible. 

- Goals: scored, conceded, average goals, clean sheets, failed-to-score rate. 

- Advanced team metrics: xG/xGA or equivalent when provided. 

- League position and points-per-match. 

Sports AI Analyst - Master Brief v2 | Greenfield Specification 

- Home advantage and away performance. 

- Rest days between matches where available. 

- Confirmed or predicted lineups. 

- Player availability: injuries and suspensions when available. 

- Key player form and recent contributions. 

- Competition and match importance. 

- Market-style data only if a reliable provider is explicitly selected and legally appropriate. 

##### **7.2 Pre-match output categories** 

The pre-match AI section must be divided into clear categories. The user should never have to read one huge AI paragraph. 

|**Category**|**Required output**|
|---|---|
|1 - Match Winner|Probabilityfor Home / Draw / Awayand the model favorite|
|2 - Goals|Expected total-goals range and over/under style interpretation<br>where supported|
|3 - Both Teams to Score|Estimated chance that both sides score|
|4 - Underdog Threat|Whether the weaker-rated side has a meaningful scoring/upset<br>path|
|5 - KeyFactors|Topevidence-backed factors<br>|
|6 - Player Impact|Players most likelyto infuence the match|
|7 - Risk|Reasons the model could be wrong|
|8 - AI Summary|Short human explanation of the completepicture|



##### **7.3 Example pre-match output** 

1/X/2: Home 54% | Draw 25% | Away 21% Goal expectation: 2-3 total goals Underdog scoring chance: 42% 

Key reason: home form + defensive edge, but away side has transition threat Risk: missing starting striker and incomplete lineup information 

Sports AI Analyst - Master Brief v2 | Greenfield Specification 

### **8. LIVE AI ENGINE - REAL-TIME INTELLIGENCE** 

A live match must be treated as a changing state. The AI engine should not simply reuse the pre-match analysis. It must ingest live statistics/events and produce an updated view of the match. 

##### **8.1 Live refresh loop** 

The live engine should operate on a configurable refresh cycle appropriate to provider limits. The exact interval should be selected after API cost and rate-limit analysis, but the architecture must support repeated updates without rebuilding the entire page. 

###### **Live provider → fresh event/stat snapshot → state diff → live feature calculation → probability update → AI context refresh → structured live insight → UI update** 

##### **8.2 Live inputs** 

- Current score and minute. 

- Goals and timestamps. 

- Red cards and yellow cards. 

- Shots and shots on target. 

- Possession. 

- Corners. 

- Attacking pressure / dangerous attacks if provider exposes them. 

- xG or equivalent live model if available. 

- Substitutions. 

- VAR / penalty events where available. 

- Current player availability after substitutions/cards. 

- Pre-match probabilities as the baseline. 

- Changes since the previous update, not just the current absolute snapshot. 

##### **8.3 Live AI categories** 

|**Category**|**What the engine should answer**|
|---|---|
|Who is more likelyto win?|Current 1/X/2probabilitiesgiven score,time and live state.|
|What happens byfull time?|Expected remaining goals / totalgoals range.|
|Can the weaker team score?|Probabilityorqualitative level of scoringthreat.|
|Momentum|Which side currentlyhas the stronger match state and why.|
|Turning point|Most important event or statistical change since last update.|
|Risk / volatility|Whether the match is stable or highlyunpredictable.|
|Next scenario|Mostplausible short-termpath,clearlylabeled as a forecast.|
|Commentary|Human-readable analyst-style explanation.|



##### **8.4 Live win-probability rules** 

The engine should start from pre-match priors and progressively update them using current state. Example factors include scoreline, time remaining, red cards, shots, xG, possession, and other provider-supported indicators. The live engine must avoid abrupt probability swings unless a real event justifies them. 

Sports AI Analyst - Master Brief v2 | Greenfield Specification 

##### **8.5 Remaining-goals forecast** 

The product should explicitly support a “goals until full time” concept. The output should distinguish between expected goals remaining and expected final total goals. Example: “Expected remaining goals: 0.8. Most likely final total: 2-3.” 

##### **8.6 Underdog scoring analysis** 

For the weaker team, provide a dedicated indicator such as “Scoring threat: Low / Moderate / High” plus a probability when data quality allows it. Explain the evidence, for example repeated shots on target, high attacking pressure, or a one-goal deficit with significant time remaining. 

##### **8.7 Live commentary cadence** 

- Do not generate a new LLM response for every trivial UI refresh. 

- Generate or update commentary when meaningful state changes occur. 

- Examples: goal, red card, major probability shift, large xG change, significant substitution, or a defined statistical threshold crossing. 

- Use cached analysis between meaningful events to control cost. 

### **9. AI TRUST, HALLUCINATION CONTROL AND DATA QUALITY** 

- Never allow the LLM to invent a statistic that is absent from the supplied context. 

- Never claim a player scored, assisted, started or was injured unless supported by provider data. 

- When data is partial, explicitly label the analysis as partial. 

- When data is stale, expose the timestamp and downgrade confidence. 

- AI output should never be presented as certainty. 

- Use a validation layer to reject malformed or unsupported output. 

### **10. MATCH PAGE - PRIMARY PRODUCT EXPERIENCE** 

The Match Details page is the most important screen in the product. It must combine factual information, visual analytics and AI intelligence into one coherent flow. 

##### **10.1 Match page structure** 

- Match header: competition, status, teams, score, time, venue. 

- AI intelligence hero: current prediction and one-sentence analyst summary. 

- AI category cards: 1/X/2, goals, underdog scoring, momentum and risk. 

- Key factors. 

- Advanced team comparison. 

- Live or pre-match statistics. 

- Recent form. 

- Head-to-head. 

Sports AI Analyst - Master Brief v2 | Greenfield Specification 

- Lineups / squad availability. 

- Timeline / live events. 

- Players to watch. 

- Additional analytics / markets where supported. 

- Favorite / follow actions. 

Sports AI Analyst - Master Brief v2 | Greenfield Specification 

### **11. PLAYER PROFILE - REQUIRED DEPTH** 

Every player page should feel like a real football intelligence profile, not a name and a few numbers. The exact data available depends on the provider, but the interface must be designed to gracefully support rich data. 

##### **11.1 Player header** 

The player header should display, when available: 

- Player photo. 

- Full name. 

- Nationality. 

- Date of birth and age. 

- Height. 

- Primary foot. 

- Primary position. 

- Squad number. 

- Current club. 

- Market value. 

- Follow player control. 

##### **11.2 Player overview card** 

|**Field**|**Requirement**<br>|
|---|---|
|Nationality|Countryname + fagwhere appropriate|
|Date of birth|Exact date, plus derived age|
|Height|Metric display,with unit|
|Primaryfoot|Left / Right / Both|
|Position|Primary position + secondary positions if available|
|Squad number|Current shirt number|
|Market value|Current value + currency;source and timestampwhere relevant|
|Average rating|Competition/season scope must be explicit|
|Former teams|Chronological club history|
|Short bio|Concise factual biography from a licensed/allowed source;<br>source attribution required|



##### **11.3 Attribute overview** 

The Attribute Overview should provide a visual summary of the player’s strengths. Use position-aware categories. Do not force goalkeeper metrics onto attackers or vice versa. 

|**Positiongroup**|**Example attributes**<br>|
|---|---|
|Goalkeeper|Shot stopping,handling,refexes,aerial,distribution, positioning|
|Defender<br>|Defending,tackling,interceptions,aerial, positioning, passing|
|Midfelder|Passing,ballprogression,vision,ball recovery,creativity, pressing<br>|
|Winger|Dribbling, pace,chance creation,crossing,fnishing,1v1 threat|
|Forward|Finishing, shot quality, movement, aerial threat, link play,<br>pressing|



Sports AI Analyst - Master Brief v2 | Greenfield Specification 

Each attribute should have a defined source, scale and update frequency. The UI should explain whether a value is provider-rated, model-generated or derived. 

##### **11.4 Player match history tab** 

A dedicated tab should show previous matches with at minimum: date, competition, opponent, home/away, minutes, rating when available, goals, assists, and key events. Each row should explicitly show if the player scored or assisted. 

##### **11.5 Match contribution badges** 

- Goal badge with goal minute where available. 

- Assist badge with assist minute where available. 

- Clean-sheet badge for applicable positions. 

- Yellow/red card badge. 

- Man-of-the-match or top-rated badge if provider supports it. 

##### **11.6 Player follow system** 

Each player profile must provide an obvious Follow control. Following a player should eventually support personalized notifications and feeds such as match appearance, goals, assists, cards and lineup confirmation. 

##### **11.7 Player tabs** 

|**Tab**|**Contents**|
|---|---|
|Overview|Identity,current club,attributes,rating,value,bio|
|Matches|Previous matches and contributions|
|Statistics|Season,competition and career statistics where supported|
|Career|Previous clubs,competitions,major milestones<br>|
|AI Insight|AI summaryof current form andplaying profle|



Sports AI Analyst - Master Brief v2 | Greenfield Specification 

### **12. CLUB / TEAM PROFILE - SOFASCORE-STYLE DEPTH** 

Club pages should be structured as a multi-tab intelligence hub. The target is the depth of a major football data product, while maintaining the distinctive Sports AI Analyst design language. 

##### **12.1 Club header** 

- Club logo. 

- Club name. 

- Country. 

- League. 

- Home venue. 

- Founded year where available. 

- Current standing summary. 

- Follow club button. 

##### **12.2 Club tabs** 

|**Tab**|**Required content**|
|---|---|
|Details|Club identity,venue,country,season summary,current form|
|Matches|Upcoming and previous matches with result, competition and<br>date|
|Standings|Current league table with club highlighted<br>|
|Squad|Goalkeepers,defenders,midfelders,forwards; player cards|
|Top Players|Top-rated, top scorers, top assists and other provider-supported<br>categories|
|Statistics|Team attacking,defensive,discipline and advanced metrics|
|Form|Last 5/10 matches,home/awaysplits,trend visualizations|
|H2H / Opponents|Useful head-to-head summaries against upcomingopponents|
|AI Insight|AI-generated summary of team identity, form and current<br>trajectory|



##### **12.3 Club matches tab behavior** 

The Matches tab should support filters by date and competition. Every match should be clickable. Match rows should carry status, score, opponent, competition and a concise result indicator. 

##### **12.4 Squad tab** 

Player cards should contain photo, name, position, shirt number, rating/summary where available, and a direct link to the player profile. The squad should support grouping and search/filtering. 

##### **12.5 Top players** 

Do not reduce this to a static ranking. Provide multiple lenses such as average rating, goals, assists, appearances, minutes, and role-specific impact when data supports it. 

##### **12.6 Club statistics** 

|**Category**|**Examples**|
|---|---|
|Attacking|Goals,shots,shots on target,xG, goalsper match<br>|
|Possession|Averagepossession,feld tilt or equivalent|
|Passing|Pass accuracy, progressivepassingwhere available|
|Defending|Tackles,interceptions,clean sheets, goals conceded|
|Discipline|Yellow cards,red cards,fouls|



Sports AI Analyst - Master Brief v2 | Greenfield Specification 

Last 5/10, home form, away form, scoring trend 

Form 

### **13. LEAGUE PAGE** 

League pages should use the same product depth as club pages, but center the experience around competition context. 

- League overview. 

- Standings. 

- Fixtures and results. 

- Top scorers / assists where available. 

- Team comparison. 

- League statistics. 

- Upcoming key matches. 

- AI league insight. 

### **14. DASHBOARD** 

The Dashboard is a personalized entry point, not a dumping ground for match lists. 

- Featured match selected by a transparent priority algorithm. 

- Live matches section. 

- Important matches today. 

- Upcoming high-interest matches. 

- Followed teams and players. 

- AI insights / notable changes. 

- Quick access to Predictions. 

Sports AI Analyst - Master Brief v2 | Greenfield Specification 

### **15. LIVE CENTER** 

The Live Center should provide a compact but information-dense view of all live matches, with special emphasis on matches where the model detects meaningful momentum or probability changes. 

- Live match list with score and minute. 

- Fast access to detailed live match pages. 

- Live AI marker for matches with fresh analysis. 

- Filter by league/status. 

- Sorted by importance and activity, not arbitrary API order. 

### **16. PREDICTIONS CENTER** 

The Predictions area should not simply duplicate the match page. It should be an aggregated view of model forecasts across matches. 

- 1/X/2 overview. 

- High-confidence candidates. 

- Goal forecasts. 

- Underdog scoring opportunities. 

- Prediction changes for live matches. 

- Historical model performance once enough data exists. 

### **17. FOLLOW / FAVORITE SYSTEM** 

Separate “favorite” convenience from persistent “follow” personalization. Favorites can represent bookmarks; follows imply ongoing updates. 

|**Object**|**Action**|**Futurepersonalization**|
|---|---|---|
|Match|Favorite|Reminder/status changes|
|Team|Follow|Upcomingmatches,scores,AI insights|
|Player|Follow|Appearances, goals, assists, cards, lineup<br>events|
|League|Follow|Keymatches and competition updates|



### **18. AUTHENTICATION + USER PROFILE** 

- Registration/login. 

- Profile settings. 

- Followed teams/players. 

- Favorite matches. 

- Notification preferences. 

Sports AI Analyst - Master Brief v2 | Greenfield Specification 

- AI usage / premium entitlement state. 

- Prediction history where appropriate. 

### **19. PREMIUM + ENTITLEMENTS** 

Premium should be feature-based, not a collection of arbitrary locked screens. 

|**Feature**|**Free**|**Premium**|
|---|---|---|
|Basic match data|Yes|Yes|
|Basic statistics|Yes|Yes|
|Basic 1/X/2prediction|Limited|Yes|
|DeepAIpre-match analysis|Limited|Yes|
|Live AI intelligence|Limited|Yes|
|Advancedplayer intelligence|Limited|Yes|
|Historicalprediction analytics|No/Limited|Yes|
|Higher AI usage limits|No|Yes|



### **20. DATA MODEL - CORE ENTITIES** 

|**Entity**|**Purpose**<br>|
|---|---|
|User|Authentication/profle ownership|
|Team|Club identityand normalized team data|
|Player|Player identityand normalized career data|
|League|Competition identity|
|Fixture|Match identityand status|
|FixtureEvent|Goals/cards/substitutions/VAR/etc.<br>|
|FixtureStatistic|Team-level live or fnal statistics|
|Lineup|StartingXI,substitutes,formation<br>|
|PlayerMatchPerformance|Player contribution in a specifc match|
|Prediction|Model forecast snapshot|
|AIInsight|Validated AI analysis tied to a data snapshot|
|Follow|Persistent user relationshipwith team/player/league|
|Favorite|Bookmark relationship|
|Subscription|Billingandplan state|
|Entitlement|Feature access rules|



Sports AI Analyst - Master Brief v2 | Greenfield Specification 

### **21. API + SERVICE ARCHITECTURE** 

UI components should not directly call the external football provider. Keep external integration isolated. 

###### **UI → application service → domain service → cache/database → provider adapter** 

##### **21.1 Provider adapter** 

Create an abstraction around the external football data provider so that the rest of the product depends on internal types rather than provider-specific response shapes. 

##### **21.2 Recommended service boundaries** 

- footballService - fixtures, teams, players, leagues, standings, statistics, lineups, events. 

- analyticsService - form, H2H, team strength, trends, player performance. 

- predictionService - pre-match and live prediction calculations. 

- aiContextService - converts trusted structured data into LLM context. 

- aiService - model invocation and structured response validation. 

- followService - follow/favorite operations. 

- entitlementService - premium permissions. 

- notificationService - future push/email/in-app updates. 

### **22. CACHING + REAL-TIME STRATEGY** 

Caching is a first-class product concern because football APIs and LLM calls can become expensive. 

|**Data**|**Suggested behavior**|
|---|---|
|Live score/events|Short TTL / event-driven refresh where supported|
|Live statistics<br>|Short TTL|
|Todayfxtures<br>|Short/medium TTL|
|Upcomingfxtures|Longer TTL|
|Team identity|LongTTL|
|Player identity|LongTTL|
|Historical H2H|LongTTL with invalidation on new data|
|AIpre-match insight|Cache until meaningful input changes|
|AI live insight|Refresh on meaningful state changes|



### **23. REAL-TIME UPDATE DESIGN** 

The application should make live updates feel smooth rather than forcing the user to refresh. 

- Use server-friendly data fetching and a client update mechanism appropriate to the chosen architecture. 

- Only update the parts of the page that changed. 

- Animate meaningful score/event changes subtly. 

- Keep the last known good state if a provider request fails temporarily. 

- Show stale-data indicators when the data age exceeds the configured threshold. 

Sports AI Analyst - Master Brief v2 | Greenfield Specification 

### **24. PLAYER BIODATA + SOURCING** 

The requested short biography should be treated differently from provider football statistics. If a biographical source such as Wikipedia is used, implement it through a defined source/integration and display attribution where required. Never silently scrape or copy content without checking terms and practical reliability. 

### **25. DESIGN SYSTEM** 

The visual target is premium sports analytics: dark-first, high information density, clean typography, restrained glow/glass effects, clear data hierarchy, and excellent responsive behavior. 

- Consistent spacing scale. 

- Consistent card radius and border treatment. 

- Clear typography hierarchy. 

- Accessible contrast. 

- Charts that prioritize readability over decoration. 

- Color semantics for positive, negative, neutral, warning and live states. 

- Animations used for state changes, not decoration. 

- No visual inconsistency between Dashboard, Match, Team and Player pages. 

### **26. PLAYER + CLUB UI DETAIL STANDARD** 

Every major entity page should feel complete at first glance. A card should not exist merely because the brief says “add a card.” Each card must answer a user question. 

|**Card**|**Question answered**|
|---|---|
|Player identity|Who is thisplayer?|
|Player attributes|What is hegood at?|
|Player form|How has heperformed recently?|
|Player match history|What did he do inpreviousgames?<br>|
|Club details|What defnes this club right now?|
|Club form|How is the teamperforming?|
|Club squad|Who is available and important?|
|Club statistics|Where is the team strong/weak?|
|AI insight|What does the data mean?|



### **27. RESPONSIVE REQUIREMENTS** 

|**Viewport**|**Expectation**|
|---|---|
|Desktop|Full sidebar/nav,multi-column analytics,dense dashboards|
|Tablet|Condensed navigation,adaptive two-column layouts<br>|
|Mobile|Single-column priority fow, sticky contextual controls where<br>useful,bottom navigation ifjustifed|



Player and club pages must remain readable on mobile. Tables should become stacked cards or horizontally scrollable sections instead of breaking the layout. 

Sports AI Analyst - Master Brief v2 | Greenfield Specification 

### **28. ACCESSIBILITY** 

- Semantic headings and landmarks. 

- Keyboard-accessible controls. 

- Visible focus states. 

- Accessible data tables/charts. 

- Color must not be the only indicator of a state. 

- Reduced-motion support. 

- Screen-reader labels for icons and compact controls. 

Sports AI Analyst - Master Brief v2 | Greenfield Specification 

### **29. PERFORMANCE REQUIREMENTS** 

- Prefer Server Components for static/server-fetched content where possible. 

- Keep client-side state localized. 

- Optimize images and team/player logos. 

- Cache external API data. 

- Cache AI outputs. 

- Avoid duplicate provider calls from multiple components. 

- Use request deduplication where possible. 

- Paginate or virtualize long lists. 

- Lazy-load heavy charts when appropriate. 

### **30. SECURITY REQUIREMENTS** 

- External API keys are server-only secrets. 

- AI provider keys are server-only secrets. 

- Database credentials are server-only secrets. 

- Validate all user input. 

- Protect authenticated routes. 

- Enforce authorization on user-owned resources. 

- Rate-limit expensive AI endpoints. 

- Prevent prompt injection from untrusted football text or user content where relevant. 

- Log security-relevant failures without exposing secrets. 

### **31. AI COST CONTROL** 

- Never call the LLM on every render. 

- Generate pre-match analysis when needed and cache it. 

- Regenerate after meaningful data changes. 

- Use compact structured contexts rather than entire raw API responses. 

- Prefer deterministic model calculations for probabilities. 

- Use LLM tokens for interpretation and scenario explanation. 

Sports AI Analyst - Master Brief v2 | Greenfield Specification 

### **32. MODEL EVALUATION** 

The prediction engine must eventually be evaluated using historical results. Track enough information to answer whether the model is calibrated and genuinely useful. 

|**Metric**|**Purpose**|
|---|---|
|Accuracy|Simple outcome accuracy|
|Brier score|Probability quality<br>|
|Logloss|Penaltyfor overconfdent errors|
|Calibration|Does 70% actuallymean roughly70% over time?|
|Performance byleague<br>|Detect weak competitions<br>|
|Performance byconfdence|Detect overconfdence|
|Live vspre-match|Compare engine modes|



### **33. AI EVALUATION** 

Maintain a benchmark set containing historical matches and expected evidence. Review AI output for factual support, relevance, uncertainty and hallucination rate. Model quality must be measurable, not assumed. 

### **34. ERROR + EMPTY + STALE STATES** 

Every major card/page needs defined states: 

- Loading - skeleton or progress indication. 

- Empty - no data available and an explanation. 

- Error - graceful explanation and retry where appropriate. 

- Stale - show last known data and age when relevant. 

- Partial - render available information but clearly communicate missing fields. 

### **35. DEVELOPMENT WORKFLOW IN CURSOR** 

Cursor should treat this document as product truth. The AI coding agent should not optimize for “make it look finished” by using fake data. It should implement the actual data contracts and state transitions. 

**1.** Inspect and understand the current phase before editing. 

**2.** Propose architecture for substantial changes. 

**3.** Implement the smallest coherent slice. 

**4.** Run type checks, linting and relevant tests. 

**5.** Inspect the resulting UI at desktop and mobile widths. 

**6.** Verify real provider data and error behavior. 

**7.** Only then move to the next slice. 

Sports AI Analyst - Master Brief v2 | Greenfield Specification 

### **36. AGENT RULES - COPY INTO CURSOR CONTEXT** 

1. Do not invent football data. 

2. Do not hardcode player history, H2H, lineups, statistics or biographies in production. 

3. Keep data retrieval, analytics, prediction and AI explanation as separate layers. 

4. The prediction engine is responsible for probabilities; the LLM is responsible for interpretation. 

5. Live matches must use a live-specific AI context and refresh strategy. 

6. AI outputs must be structured and validated before rendering. 

7. Always expose uncertainty and data quality. 

8. Cache expensive football API and AI operations. 

9. Do not expose secrets to the browser. 

10. Every production feature needs loading, empty, error and stale-data states. 

11. Build the deep Match, Player and Club experiences described in this brief; do not reduce them to placeholder cards. 

12. When a provider does not support a field, show a proper unavailable state rather than fabricate a value. 

13. Avoid unnecessary client-side rendering. 

14. Prefer reusable domain services and typed contracts. 

15. Before declaring a phase complete, verify correctness, not only visual appearance. 

### **37. DEVELOPMENT PHASES** 

|**Phase**|**Primary goal**|**Defnition of done**|
|---|---|---|
|0|Foundation|Architecture, rules, data-provider<br>selection,design system|
|1|Football data|Reliable normalized football data layer<br>with caching/error handling|
|2|Core UX|Dashboard, match discovery, match<br>details,live center|
|3|Analytics|Form, H2H, comparison, team/player<br>statistics, prediction engine|
|4|AI|Pre-match and live AI engine with<br>structured outputs|
|5|Entityintelligence|Deep player,club and leaguepages|
|6|Accounts|Auth,follows,favorites, preferences|
|7|Premium|Entitlements, subscription and usage<br>controls|
|8|Evaluation|Prediction and AIqualitymeasurement|
|9|Production|Security, performance, SEO, observability,<br>deployment|



### **38. MVP DEFINITION** 

The first marketable version is complete when a user can open a real match, read trustworthy facts, understand current or expected probabilities, see evidence-backed factors, read AI analysis, and follow the match/team/player. The system should be genuinely data-driven before adding complex gamification. 

### **39. FINAL PRODUCT STANDARD** 

The final product should feel like a serious sports intelligence company built around football. The design should be premium. The data should be real. The predictions should be measurable. The AI should explain rather than hallucinate. The live system should react to the match as it evolves. 

**The defining capability is not “AI text”. The defining capability is a continuous intelligence loop: real data → model → explanation → updated state.** 

Sports AI Analyst - Master Brief v2 | Greenfield Specification 

### **40. FINAL IMPLEMENTATION CHECKLIST** 

- Football data provider selected and costed. 

- Normalized domain model defined. 

- Provider adapter isolated. 

- Caching strategy implemented. 

- Dashboard built around match priority. 

- Match page built to the required depth. 

- Pre-match prediction engine implemented. 

- Live prediction engine implemented. 

- AI pre-match analysis implemented. 

- AI live commentary implemented with meaningful-event refresh. 

- Player profiles built to required field depth. 

- Player match history includes goals/assists indicators. 

- Player follow functionality implemented. 

- Club pages include Details, Matches, Standings, Squad, Top Players and Statistics. 

- Team/player/league pages use real data. 

- Auth and persistence implemented. 

- Premium entitlements implemented. 

- Prediction performance tracked. 

- AI evaluation framework implemented. 

- Security/performance/accessibility checks complete. 

- Production deployment verified. 

Sports AI Analyst - Master Brief v2 | Greenfield Specification 

