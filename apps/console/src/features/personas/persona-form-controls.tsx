import { Check, ChevronDown, Plus } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { SkillSummary } from '@guide/contracts'
import { focusAdjacentOption, useDismissablePopover } from './persona-popover'

const voiceOptions = [
  { value: 'female', label: '女声' },
  { value: 'male', label: '男声' },
]

interface VoiceSelectProps {
  value: string
  labelId: string
  onChange: (value: string) => void
}

export function VoiceSelect({ value, labelId, onChange }: VoiceSelectProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const listId = useId()
  const valueId = useId()
  const selectedOption = voiceOptions.find((option) => option.value === value) ?? voiceOptions[0]
  const close = useCallback(() => setOpen(false), [])

  useDismissablePopover({ open, rootRef, triggerRef, onClose: close })

  useEffect(() => {
    if (!open) return
    window.requestAnimationFrame(() => listRef.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus())
  }, [open])

  const select = (nextValue: string) => {
    onChange(nextValue)
    close()
    triggerRef.current?.focus()
  }
  const handleOptionKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    focusAdjacentOption(listRef.current, event.currentTarget, event.key === 'ArrowDown' ? 1 : -1)
  }

  return (
    <div className="persona-select" ref={rootRef}>
      <button
        ref={triggerRef}
        className="persona-select-trigger"
        type="button"
        aria-labelledby={`${labelId} ${valueId}`}
        aria-controls={listId}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setOpen(true)
          }
        }}
      >
        <span id={valueId}>{selectedOption.label}</span>
        <ChevronDown aria-hidden="true" size={16} strokeWidth={1.8} />
      </button>
      {open ? (
        <div className="persona-select-options" id={listId} ref={listRef} role="listbox" aria-labelledby={labelId}>
          {voiceOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              onClick={() => select(option.value)}
              onKeyDown={handleOptionKeyDown}
            >
              <span>{option.label}</span>
              {option.value === value ? <Check aria-hidden="true" size={16} strokeWidth={2} /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

interface SkillPickerProps {
  skills: SkillSummary[]
  selectedSkillIds: Set<string>
  onToggleSkill: (skillId: string) => void
}

function SkillOption({ skill, selected, onToggle }: { skill: SkillSummary; selected: boolean; onToggle: () => void }) {
  return (
    <button type="button" role="checkbox" aria-checked={selected} className="persona-skill-popover-option" onClick={onToggle}>
      <span>
        <strong>{skill.name}</strong>
        <small>v{skill.version}</small>
      </span>
      {selected ? <Check aria-hidden="true" size={16} strokeWidth={2} /> : <Plus aria-hidden="true" size={16} strokeWidth={2} />}
    </button>
  )
}

export function SkillPicker({ skills, selectedSkillIds, onToggleSkill }: SkillPickerProps) {
  const [open, setOpen] = useState(false)
  const [side, setSide] = useState<'bottom' | 'top'>('bottom')
  const rootRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const contentId = useId()
  const close = useCallback(() => setOpen(false), [])
  const officialSkills = skills.filter((skill) => skill.source === 'official')
  const cloudSkills = skills.filter((skill) => skill.source === 'cloud')

  useDismissablePopover({ open, rootRef, triggerRef, onClose: close })

  useEffect(() => {
    if (!open) return

    const updateSide = () => {
      const trigger = triggerRef.current
      const content = contentRef.current
      if (!trigger || !content) return
      const triggerRect = trigger.getBoundingClientRect()
      const contentHeight = content.getBoundingClientRect().height
      const availableBelow = window.innerHeight - triggerRect.bottom - 8
      const availableAbove = triggerRect.top - 8
      setSide(contentHeight > availableBelow && availableAbove > availableBelow ? 'top' : 'bottom')
    }
    const frame = window.requestAnimationFrame(updateSide)
    window.addEventListener('resize', updateSide)
    window.addEventListener('scroll', updateSide, true)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', updateSide)
      window.removeEventListener('scroll', updateSide, true)
    }
  }, [open])

  return (
    <div className="persona-skill-popover" ref={rootRef}>
      <button
        ref={triggerRef}
        className="guide-button guide-button-secondary persona-skill-popover-trigger"
        type="button"
        aria-controls={contentId}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((current) => !current)}
      >
        <Plus aria-hidden="true" size={16} strokeWidth={2} />
        添加自定义技能
        <ChevronDown aria-hidden="true" size={16} strokeWidth={1.8} />
      </button>
      {open ? (
        <div className="persona-skill-popover-content" id={contentId} ref={contentRef} role="dialog" aria-label="选择自定义技能" data-side={side}>
          {officialSkills.length > 0 ? (
            <section aria-labelledby="official-skills-title">
              <h3 id="official-skills-title">官方技能</h3>
              {officialSkills.map((skill) => <SkillOption key={skill.id} skill={skill} selected={selectedSkillIds.has(skill.id)} onToggle={() => onToggleSkill(skill.id)} />)}
            </section>
          ) : null}
          {cloudSkills.length > 0 ? (
            <section aria-labelledby="cloud-skills-title">
              <h3 id="cloud-skills-title">云端技能</h3>
              {cloudSkills.map((skill) => <SkillOption key={skill.id} skill={skill} selected={selectedSkillIds.has(skill.id)} onToggle={() => onToggleSkill(skill.id)} />)}
            </section>
          ) : null}
          {skills.length === 0 ? <p className="persona-empty-copy">暂无兼容技能。</p> : null}
          <div className="persona-skill-popover-footer">
            <button className="guide-button guide-button-primary" type="button" onClick={() => { close(); triggerRef.current?.focus() }}>完成</button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
