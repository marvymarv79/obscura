import { useState, useEffect } from 'react'

const PROCESSING_SOFTWARE_OPTIONS = ['Seestar', 'Siril', 'PixInsight', 'Photoshop', 'Lightroom']

export default function Journal({
  entries,
  tags,
  loading,
  onCreateEntry,
  onUpdateEntry,
  onDeleteEntry,
  onCreateTag,
  onDeleteTag,
  onRefresh,
  prefillData,
  onPrefillConsumed,
  onSwitchTab
}) {
  const [showEditor, setShowEditor] = useState(false)
  const [editingEntry, setEditingEntry] = useState(null)
  const [filterTag, setFilterTag] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Editor state
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedTags, setSelectedTags] = useState([])
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#3b82f6')
  const [saving, setSaving] = useState(false)
  const [imagingTrainId, setImagingTrainId] = useState('')
  const [processingSoftware, setProcessingSoftware] = useState([])

  // Imaging train profiles from Apertura
  const [imagingTrains, setImagingTrains] = useState([])
  const [trainsLoading, setTrainsLoading] = useState(false)

  // Handle prefill from Plans tab
  useEffect(() => {
    if (prefillData) {
      setTitle(prefillData.title || '')
      setContent(prefillData.content || '')
      setEntryDate(prefillData.entryDate || new Date().toISOString().split('T')[0])
      setSelectedTags([])
      setProcessingSoftware([])
      setShowEditor(true)
      setEditingEntry(null)
      if (onPrefillConsumed) onPrefillConsumed()
    }
  }, [prefillData]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setTrainsLoading(true)
    fetch('/api/apertura/profiles')
      .then(r => r.ok ? r.json() : [])
      .then(data => setImagingTrains(Array.isArray(data) ? data : []))
      .catch(() => setImagingTrains([]))
      .finally(() => setTrainsLoading(false))
  }, [])

  const tagColors = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#84cc16'  // lime
  ]

  const formatDate = (dateStr) => {
    // Parse as local date to avoid UTC offset shifting the day back
    const parts = String(dateStr).split('-')
    const d = parts.length === 3
      ? new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
      : new Date(dateStr)
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const openEditor = (entry = null) => {
    if (entry) {
      setEditingEntry(entry)
      setTitle(entry.title)
      setContent(entry.content || '')
      setEntryDate(entry.entryDate)
      setSelectedTags(entry.tags?.map(t => t.id) || [])
      setImagingTrainId(entry.imagingTrainId ? String(entry.imagingTrainId) : '')
      setProcessingSoftware(entry.processingSoftware ? entry.processingSoftware.split(',').filter(Boolean) : [])
    } else {
      setEditingEntry(null)
      setTitle('')
      setContent('')
      setEntryDate(new Date().toISOString().split('T')[0])
      setSelectedTags([])
      setImagingTrainId('')
      setProcessingSoftware([])
    }
    setShowEditor(true)
  }

  const closeEditor = () => {
    setShowEditor(false)
    setEditingEntry(null)
    setTitle('')
    setContent('')
    setSelectedTags([])
    setNewTagName('')
    setImagingTrainId('')
    setProcessingSoftware([])
  }

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Please enter a title')
      return
    }

    setSaving(true)
    try {
      // Collect new tags to create
      const newTags = []
      if (newTagName.trim()) {
        newTags.push({ name: newTagName.trim(), color: newTagColor })
      }

      const entryData = {
        title: title.trim(),
        content: content.trim(),
        entryDate,
        imagingTrainId: imagingTrainId ? parseInt(imagingTrainId, 10) : null,
        processingSoftware: processingSoftware.length > 0 ? processingSoftware.join(',') : null,
        tagIds: selectedTags,
        newTags
      }

      if (editingEntry) {
        await onUpdateEntry(editingEntry.id, entryData)
      } else {
        await onCreateEntry(entryData)
      }

      closeEditor()
    } catch (error) {
      alert('Failed to save: ' + error.message)
    }
    setSaving(false)
  }

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return

    try {
      const newTag = await onCreateTag({ name: newTagName.trim(), color: newTagColor })
      setSelectedTags(prev => [...prev, newTag.id])
      setNewTagName('')
    } catch (error) {
      alert('Failed to create tag: ' + error.message)
    }
  }

  const toggleTag = (tagId) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    )
  }

  const toggleSoftware = (name) => {
    setProcessingSoftware(prev =>
      prev.includes(name)
        ? prev.filter(s => s !== name)
        : [...prev, name]
    )
  }

  const getTrainName = (trainId) => {
    if (!trainId) return null
    const train = imagingTrains.find(t => t.id === trainId || t.id === parseInt(trainId, 10))
    return train ? train.profile_name : null
  }

  // Filter entries
  const filteredEntries = entries.filter(entry => {
    if (filterTag && !entry.tags?.some(t => t.id === filterTag)) {
      return false
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        entry.title.toLowerCase().includes(query) ||
        (entry.content && entry.content.toLowerCase().includes(query))
      )
    }
    return true
  })

  if (loading) {
    return (
      <div className="journal">
        <div className="journal-loading">Loading journal...</div>
      </div>
    )
  }

  return (
    <div className="journal">
      <div className="journal-header">
        <h3>📓 Journal</h3>
        <div className="journal-actions">
          <button className="refresh-button" onClick={onRefresh} title="Refresh">↻</button>
          <button className="new-entry-button" onClick={() => openEditor()}>+ New Entry</button>
        </div>
      </div>

      {/* Filters */}
      <div className="journal-filters">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search entries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {tags.length > 0 && (
          <div className="tag-filters">
            <button
              className={`tag-filter ${filterTag === null ? 'active' : ''}`}
              onClick={() => setFilterTag(null)}
            >
              All
            </button>
            {tags.map(tag => (
              <button
                key={tag.id}
                className={`tag-filter ${filterTag === tag.id ? 'active' : ''}`}
                style={{ '--tag-color': tag.color || '#666' }}
                onClick={() => setFilterTag(filterTag === tag.id ? null : tag.id)}
              >
                {tag.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Entry List */}
      {filteredEntries.length === 0 ? (
        <div className="journal-empty">
          {entries.length === 0 ? (
            <>
              <div className="empty-icon">📓</div>
              <h3>No Journal Entries</h3>
              <p>Create your first entry to start logging observations, notes, and insights.</p>
              <button className="primary-button" onClick={() => openEditor()}>Create Entry</button>
            </>
          ) : (
            <p>No entries match your filters.</p>
          )}
        </div>
      ) : (
        <div className="journal-entries">
          {filteredEntries.map(entry => (
            <div key={entry.id} className="journal-entry-card" onClick={() => openEditor(entry)}>
              <div className="entry-header">
                <h4 className="entry-title">{entry.title}</h4>
                <span className="entry-date">{formatDate(entry.entryDate)}</span>
              </div>
              {getTrainName(entry.imagingTrainId) && (
                <div className="entry-imaging-train">{getTrainName(entry.imagingTrainId)}</div>
              )}
              {(entry.planId || entry.plan_id || entry.imagingPlanId || entry.imaging_plan_id) && onSwitchTab && (
                <button className="entry-plan-link" onClick={(e) => { e.stopPropagation(); onSwitchTab('plans') }}>
                  View plan →
                </button>
              )}
              {entry.content && (
                <p className="entry-preview">
                  {entry.content.length > 150
                    ? entry.content.substring(0, 150) + '...'
                    : entry.content}
                </p>
              )}
              <div className="entry-meta-row">
                {entry.tags && entry.tags.length > 0 && (
                  <div className="entry-tags">
                    {entry.tags.map(tag => (
                      <span
                        key={tag.id}
                        className="entry-tag"
                        style={{ backgroundColor: tag.color || '#666' }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}
                {entry.processingSoftware && (
                  <div className="entry-software-pills">
                    {entry.processingSoftware.split(',').filter(Boolean).map(sw => (
                      <span key={sw} className="software-pill">{sw}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor Modal */}
      {showEditor && (
        <div className="journal-editor-overlay" onClick={closeEditor}>
          <div className="journal-editor" onClick={(e) => e.stopPropagation()}>
            <div className="editor-header">
              <h3>{editingEntry ? 'Edit Entry' : 'New Entry'}</h3>
              <button className="close-button" onClick={closeEditor}>×</button>
            </div>

            <div className="editor-form">
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Entry title..."
                />
              </div>

              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Content (Markdown supported)</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your notes, observations, or insights..."
                  rows={10}
                />
              </div>

              <div className="form-group">
                <label>Imaging Train</label>
                <select
                  value={imagingTrainId}
                  onChange={(e) => setImagingTrainId(e.target.value)}
                  className="imaging-train-select"
                >
                  <option value="">— None —</option>
                  {trainsLoading ? (
                    <option disabled>Loading...</option>
                  ) : imagingTrains.length === 0 ? (
                    <option disabled>— Unavailable —</option>
                  ) : (
                    imagingTrains.map(train => (
                      <option key={train.id} value={train.id}>
                        {train.profile_name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="form-group">
                <label>Processing Software</label>
                <div className="software-checkboxes">
                  {PROCESSING_SOFTWARE_OPTIONS.map(sw => (
                    <label key={sw} className="software-checkbox-label">
                      <input
                        type="checkbox"
                        checked={processingSoftware.includes(sw)}
                        onChange={() => toggleSoftware(sw)}
                      />
                      <span>{sw}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Tags</label>
                <div className="tags-selector">
                  {tags.map(tag => (
                    <button
                      key={tag.id}
                      className={`tag-button ${selectedTags.includes(tag.id) ? 'selected' : ''}`}
                      style={{ '--tag-color': tag.color || '#666' }}
                      onClick={() => toggleTag(tag.id)}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>

                <div className="new-tag-form">
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="New tag name..."
                  />
                  <div className="color-picker">
                    {tagColors.map(color => (
                      <button
                        key={color}
                        className={`color-option ${newTagColor === color ? 'selected' : ''}`}
                        style={{ backgroundColor: color }}
                        onClick={() => setNewTagColor(color)}
                      />
                    ))}
                  </div>
                  <button
                    className="add-tag-button"
                    onClick={handleCreateTag}
                    disabled={!newTagName.trim()}
                  >
                    Add Tag
                  </button>
                </div>
              </div>
            </div>

            <div className="editor-footer">
              {editingEntry && (
                <button
                  className="delete-button"
                  onClick={() => {
                    if (confirm('Delete this entry?')) {
                      onDeleteEntry(editingEntry.id)
                      closeEditor()
                    }
                  }}
                >
                  Delete
                </button>
              )}
              <div className="editor-actions">
                <button className="cancel-button" onClick={closeEditor}>Cancel</button>
                <button
                  className="save-button"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
