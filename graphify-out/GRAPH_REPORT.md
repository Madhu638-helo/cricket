# Graph Report - cricket-score  (2026-05-30)

## Corpus Check
- 126 files · ~330,815 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2864 nodes · 6797 edges · 17 communities detected
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 41 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]

## God Nodes (most connected - your core abstractions)
1. `slice()` - 24 edges
2. `interpretNode()` - 22 edges
3. `write()` - 20 edges
4. `sl()` - 20 edges
5. `co()` - 20 edges
6. `write()` - 20 edges
7. `$()` - 20 edges
8. `slice()` - 20 edges
9. `addErrorMessage()` - 19 edges
10. `addErrorMessage()` - 19 edges

## Surprising Connections (you probably didn't know these)
- `Do()` --calls--> `_t()`  [INFERRED]
  src/generated/prisma/runtime/edge.js → src/generated/prisma/query_engine_bg.js
- `a()` --calls--> `$a()`  [INFERRED]
  src/generated/prisma/runtime/edge.js → src/generated/prisma/runtime/wasm-engine-edge.js
- `constructor()` --calls--> `or()`  [INFERRED]
  src/generated/prisma/runtime/wasm-compiler-edge.js → src/generated/prisma/runtime/library.js
- `ja()` --calls--> `$m()`  [INFERRED]
  src/generated/prisma/runtime/library.js → src/generated/prisma/runtime/wasm-compiler-edge.js
- `ml()` --calls--> `gm()`  [INFERRED]
  src/generated/prisma/runtime/library.js → src/generated/prisma/runtime/wasm-compiler-edge.js

## Communities

### Community 0 - "Community 0"
Cohesion: 0.01
Nodes (408): $(), _a(), aa(), ac(), Ad(), addErrorMessage(), addField(), addItem() (+400 more)

### Community 1 - "Community 1"
Cohesion: 0.01
Nodes (378): A(), Aa(), ad(), addErrorMessage(), addField(), addItem(), addMarginSymbol(), addSuggestion() (+370 more)

### Community 2 - "Community 2"
Cohesion: 0.01
Nodes (330): a(), Aa(), ac(), addErrorMessage(), addField(), addItem(), addMarginSymbol(), addSuggestion() (+322 more)

### Community 3 - "Community 3"
Cohesion: 0.01
Nodes (312): a(), addErrorMessage(), addField(), addItem(), addMarginSymbol(), addSuggestion(), afterNextNewline(), Ai() (+304 more)

### Community 4 - "Community 4"
Cohesion: 0.01
Nodes (321): a(), Aa(), ac(), addErrorMessage(), addField(), addItem(), addMarginSymbol(), addSuggestion() (+313 more)

### Community 5 - "Community 5"
Cohesion: 0.01
Nodes (310): Ul(), _(), addErrorMessage(), addField(), addItem(), addMarginSymbol(), addSuggestion(), Ae() (+302 more)

### Community 6 - "Community 6"
Cohesion: 0.03
Nodes (42): POST(), handleScore(), handleWicketConfirm(), processLocalBall(), submitOver(), handleCreate(), ballsToOvers(), ballToSummary() (+34 more)

### Community 7 - "Community 7"
Cohesion: 0.05
Nodes (39): a(), ae(), at(), b(), be(), dt(), E(), ee() (+31 more)

### Community 8 - "Community 8"
Cohesion: 0.06
Nodes (38): b(), be(), bn(), ce(), constructor(), De(), _e(), F() (+30 more)

### Community 9 - "Community 9"
Cohesion: 0.11
Nodes (17): AnyNull, DataLoader, DbNull, Decimal, JsonNull, MergedExtensionsList, MetricsClient, NullTypesEnumValue (+9 more)

### Community 10 - "Community 10"
Cohesion: 0.2
Nodes (1): Sheet()

### Community 11 - "Community 11"
Cohesion: 0.33
Nodes (5): AnyNull, DbNull, Decimal, JsonNull, NullTypesEnumValue

### Community 12 - "Community 12"
Cohesion: 0.6
Nodes (5): handleNoBall(), handleScore(), handleWicket(), handleWide(), vibrate()

### Community 13 - "Community 13"
Cohesion: 0.4
Nodes (4): AnyNull, DbNull, JsonNull, PrismaClient

### Community 14 - "Community 14"
Cohesion: 0.5
Nodes (2): pointsToArea(), pointsToPath()

### Community 16 - "Community 16"
Cohesion: 0.67
Nodes (2): Avatar(), pickGradient()

### Community 17 - "Community 17"
Cohesion: 0.67
Nodes (1): PrismaClient

## Knowledge Gaps
- **26 isolated node(s):** `PrismaClient`, `DbNull`, `JsonNull`, `AnyNull`, `AnyNull` (+21 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 10`** (10 nodes): `InningsBreakSheet()`, `handleSelect()`, `Sheet()`, `handleConfirm()`, `handleConfirm()`, `InningsBreakSheet.tsx`, `PlayerSelectSheet.tsx`, `Sheet.tsx`, `TossSheet.tsx`, `WicketSheet.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 14`** (5 nodes): `buildPoints()`, `pointsToArea()`, `pointsToPath()`, `toSvgY()`, `WormGraph.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 16`** (4 nodes): `Avatar.tsx`, `Avatar()`, `initials()`, `pickGradient()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (3 nodes): `PrismaClient`, `.constructor()`, `index-browser.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `V()` connect `Community 3` to `Community 2`, `Community 4`?**
  _High betweenness centrality (0.203) - this node is a cross-community bridge._
- **Why does `$a()` connect `Community 2` to `Community 3`, `Community 5`?**
  _High betweenness centrality (0.166) - this node is a cross-community bridge._
- **What connects `PrismaClient`, `DbNull`, `JsonNull` to the rest of the system?**
  _26 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.01 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.01 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.01 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.01 - nodes in this community are weakly interconnected._