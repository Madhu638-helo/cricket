import re

with open('src/app/match/[code]/page.tsx', 'r') as f:
    content = f.read()

# 1. Imports
content = content.replace("import BatsmanCard from '@/components/scoring/BatsmanCard';", "import PlayerStatsCard from '@/components/scoring/PlayerStatsCard';")
content = content.replace("import BowlerCard from '@/components/scoring/BowlerCard';\n", "")

# 2. Main structure wrapper
# Replace <main className="main-content"> with <div className="screen" id={isScorer ? "s-scoring" : "s-spectate"}>
content = content.replace('<main className="main-content">', '<div className="screen" id={isScorer ? "s-scoring" : "s-spectate"}>')
content = content.replace('</main>', '</div>')

# 3. Loading state wrapper
content = content.replace('<main className="main-content" style={{ display: \'flex\', alignItems: \'center\', justifyContent: \'center\' }}>', '<div className="screen" style={{ display: \'flex\', alignItems: \'center\', justifyContent: \'center\' }}>')

# 4. Remove ScoreHeader container (ScoreHeader is sticky now)
# (Keep it as is, we updated ScoreHeader)
# Add onOpenScorecard to ScoreHeader
content = content.replace(
    'isFreehitNext={isFreehitNext}',
    'isFreehitNext={isFreehitNext}\n            onOpenScorecard={() => setActiveTab(\'scorecard\')}'
)

# 5. Active Tab 'score' layout: Replace Batsman/Bowler/OverDots with PlayerStatsCard
old_score_tab = """              {strikerStats && <BatsmanCard batsman={strikerStats} />}
              {nonStrikerStats && <BatsmanCard batsman={nonStrikerStats} />}
              {bowlerStats && <BowlerCard bowler={bowlerStats} />}

              {/* Current over */}
              {currentOverBalls.length > 0 && (
                <div className="card card-compact">
                  <OverDots balls={currentOverBalls} overNumber={currentOverNum + 1} maxBalls={match.overs > 0 ? 6 : 6} />
                </div>
              )}"""

new_score_tab = """              {(strikerStats || bowlerStats) && (
                <PlayerStatsCard 
                  striker={strikerStats}
                  nonStriker={nonStrikerStats}
                  bowler={bowlerStats}
                  currentOverBalls={currentOverBalls}
                  maxBallsPerOver={match.overs > 0 ? 6 : 6}
                  currentOverNum={currentOverNum + 1}
                />
              )}"""
content = content.replace(old_score_tab, new_score_tab)

# 6. Some styling updates in score tab
content = content.replace('className="card card-compact"', 'className="card" style={{ padding: "12px", marginBottom: "10px" }}')
content = content.replace('className="section-title"', 'className="heading" style={{ fontSize: "16px" }}')
content = content.replace('var(--sp-3)', '16px')
content = content.replace('var(--sp-4)', '20px')

# 7. Write it back
with open('src/app/match/[code]/page.tsx', 'w') as f:
    f.write(content)

