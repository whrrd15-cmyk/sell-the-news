import { SKILLS } from '../../data/skills'
import { getSkillIcon } from '../icons/SkillIcons'
import type { SkillCategory } from '../../data/types'

interface PerksGridProps {
  unlockedSkills: string[]
}

const CATEGORY_COLORS: Record<SkillCategory, string> = {
  analysis: '#5b9bd5',
  literacy: '#f0b429',
  investment: '#5ec269',
  passive: '#9b72cf',
}

export function PerksGrid({ unlockedSkills }: PerksGridProps) {
  return (
    <div className="grid grid-cols-4 gap-1">
      {SKILLS.map((skill) => {
        const isUnlocked = unlockedSkills.includes(skill.id)
        const color = CATEGORY_COLORS[skill.category]

        return (
          <div
            key={skill.id}
            className="relative group aspect-square flex items-center justify-center rounded-lg"
            style={{
              background: isUnlocked ? `${color}22` : '#151528',
              border: `1px solid ${isUnlocked ? color + '66' : '#ffffff11'}`,
            }}
            title={isUnlocked ? `${skill.name}: ${skill.description}` : '???'}
          >
            {isUnlocked ? (
              <span style={{ filter: 'drop-shadow(0 0 4px ' + color + ')' }}>
                {getSkillIcon(skill.id, 18, color)}
              </span>
            ) : (
              <span className="text-bal-text-dim text-xs">·</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
