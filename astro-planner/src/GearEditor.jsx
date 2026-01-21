import { useState, useEffect } from 'react'
import { USER_GEAR } from './gearconfig'
import { useApi } from './hooks/useApi'

function GearEditor({ customGear, setCustomGear }) {
  const { get, post, put, del, isSignedIn } = useApi()
  const [activeSection, setActiveSection] = useState('cameras')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Load gear from API on mount
  useEffect(() => {
    if (!isSignedIn) return

    async function loadGear() {
      setLoading(true)
      setError(null)
      try {
        const [camerasData, opticsData, setupsData] = await Promise.all([
          get('/api/cameras'),
          get('/api/optics'),
          get('/api/setups')
        ])

        // Transform API data to frontend format
        const cameras = camerasData.map(c => ({
          id: c.id,
          name: c.name,
          sensorWidth: parseFloat(c.sensorWidth) || 0,
          sensorHeight: parseFloat(c.sensorHeight) || 0,
          pixelSize: parseFloat(c.pixelSize) || 0,
          resolution: {
            width: c.resolutionWidth || 0,
            height: c.resolutionHeight || 0
          },
          type: c.type || 'cooled',
          color: c.isColor !== false,
          isCustom: true
        }))

        const optics = opticsData.map(o => ({
          id: o.id,
          name: o.name,
          focalLength: parseFloat(o.focalLength) || 0,
          aperture: parseFloat(o.aperture) || 0,
          fRatio: parseFloat(o.fRatio) || 0,
          type: o.type || 'refractor',
          isCustom: true
        }))

        const setups = setupsData.map(s => ({
          id: s.id,
          name: s.name,
          camera: s.cameraId || s.defaultCameraId,
          optic: s.opticId || s.defaultOpticId,
          focalLength: parseFloat(s.focalLength) || 0,
          pixelScale: parseFloat(s.pixelScale) || 0,
          fov: {
            width: parseFloat(s.fovWidth) || 0,
            height: parseFloat(s.fovHeight) || 0
          },
          category: s.category || 'main-rig',
          isCustom: true
        }))

        setCustomGear({ cameras, optics, setups })
      } catch (err) {
        console.error('Failed to load gear:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadGear()
  }, [isSignedIn])

  // Camera form state
  const [cameraForm, setCameraForm] = useState({
    name: '',
    sensorWidth: '',
    sensorHeight: '',
    pixelSize: '',
    resolutionWidth: '',
    resolutionHeight: '',
    type: 'cooled',
    color: true
  })

  // Optics form state
  const [opticForm, setOpticForm] = useState({
    name: '',
    focalLength: '',
    aperture: '',
    type: 'refractor'
  })

  // Setup form state
  const [setupForm, setSetupForm] = useState({
    name: '',
    cameraId: '',
    opticId: '',
    category: 'main-rig'
  })

  // Get all cameras (defaults + custom)
  const getAllCameras = () => {
    return [...USER_GEAR.cameras, ...(customGear.cameras || [])]
  }

  // Get all optics (defaults + custom)
  const getAllOptics = () => {
    return [...USER_GEAR.optics, ...(customGear.optics || [])]
  }

  // Get all setups (custom only - we'll let users create their own setups)
  const getAllSetups = () => {
    return customGear.setups || []
  }

  // Auto-calculate f-ratio
  const calculateFRatio = (focalLength, aperture) => {
    if (focalLength && aperture && aperture > 0) {
      return (focalLength / aperture).toFixed(1)
    }
    return '--'
  }

  // Auto-calculate pixel scale (arcsec/pixel)
  const calculatePixelScale = (pixelSize, focalLength) => {
    if (pixelSize && focalLength && focalLength > 0) {
      return ((pixelSize / focalLength) * 206.265).toFixed(2)
    }
    return '--'
  }

  // Auto-calculate FOV (arcminutes)
  const calculateFOV = (sensorSize, focalLength) => {
    if (sensorSize && focalLength && focalLength > 0) {
      return ((sensorSize / focalLength) * 3438).toFixed(1)
    }
    return '--'
  }

  // Get setup calculations based on selected camera and optic
  const getSetupCalculations = () => {
    const camera = getAllCameras().find(c => c.id === setupForm.cameraId)
    const optic = getAllOptics().find(o => o.id === setupForm.opticId)

    if (!camera || !optic) {
      return { pixelScale: '--', fovWidth: '--', fovHeight: '--' }
    }

    return {
      pixelScale: calculatePixelScale(camera.pixelSize, optic.focalLength),
      fovWidth: calculateFOV(camera.sensorWidth, optic.focalLength),
      fovHeight: calculateFOV(camera.sensorHeight, optic.focalLength)
    }
  }

  const resetForms = () => {
    setCameraForm({
      name: '',
      sensorWidth: '',
      sensorHeight: '',
      pixelSize: '',
      resolutionWidth: '',
      resolutionHeight: '',
      type: 'cooled',
      color: true
    })
    setOpticForm({
      name: '',
      focalLength: '',
      aperture: '',
      type: 'refractor'
    })
    setSetupForm({
      name: '',
      cameraId: '',
      opticId: '',
      category: 'main-rig'
    })
    setEditingId(null)
    setShowForm(false)
  }

  // Camera handlers
  const handleCameraSubmit = async (e) => {
    e.preventDefault()
    if (!cameraForm.name.trim()) {
      alert('Please enter a camera name')
      return
    }

    const cameraData = {
      name: cameraForm.name.trim(),
      sensorWidth: parseFloat(cameraForm.sensorWidth) || null,
      sensorHeight: parseFloat(cameraForm.sensorHeight) || null,
      pixelSize: parseFloat(cameraForm.pixelSize) || null,
      resolutionWidth: parseInt(cameraForm.resolutionWidth) || null,
      resolutionHeight: parseInt(cameraForm.resolutionHeight) || null,
      type: cameraForm.type,
      isColor: cameraForm.color
    }

    try {
      if (editingId) {
        // Update existing camera
        const updated = await put(`/api/cameras/${editingId}`, cameraData)
        const camera = {
          id: updated.id,
          name: updated.name,
          sensorWidth: parseFloat(updated.sensorWidth) || 0,
          sensorHeight: parseFloat(updated.sensorHeight) || 0,
          pixelSize: parseFloat(updated.pixelSize) || 0,
          resolution: {
            width: updated.resolutionWidth || 0,
            height: updated.resolutionHeight || 0
          },
          type: updated.type,
          color: updated.isColor !== false,
          isCustom: true
        }
        setCustomGear(prev => ({
          ...prev,
          cameras: prev.cameras.map(c => c.id === editingId ? camera : c)
        }))
      } else {
        // Create new camera
        const created = await post('/api/cameras', cameraData)
        const camera = {
          id: created.id,
          name: created.name,
          sensorWidth: parseFloat(created.sensorWidth) || 0,
          sensorHeight: parseFloat(created.sensorHeight) || 0,
          pixelSize: parseFloat(created.pixelSize) || 0,
          resolution: {
            width: created.resolutionWidth || 0,
            height: created.resolutionHeight || 0
          },
          type: created.type,
          color: created.isColor !== false,
          isCustom: true
        }
        setCustomGear(prev => ({
          ...prev,
          cameras: [...(prev.cameras || []), camera]
        }))
      }
      resetForms()
    } catch (err) {
      console.error('Failed to save camera:', err)
      alert('Failed to save camera: ' + err.message)
    }
  }

  const handleEditCamera = (camera) => {
    setCameraForm({
      name: camera.name,
      sensorWidth: camera.sensorWidth?.toString() || '',
      sensorHeight: camera.sensorHeight?.toString() || '',
      pixelSize: camera.pixelSize?.toString() || '',
      resolutionWidth: camera.resolution?.width?.toString() || '',
      resolutionHeight: camera.resolution?.height?.toString() || '',
      type: camera.type || 'cooled',
      color: camera.color !== false
    })
    setEditingId(camera.id)
    setShowForm(true)
  }

  const handleDeleteCamera = async (id) => {
    if (!confirm('Delete this camera?')) return
    try {
      await del(`/api/cameras/${id}`)
      setCustomGear(prev => ({
        ...prev,
        cameras: prev.cameras.filter(c => c.id !== id)
      }))
    } catch (err) {
      console.error('Failed to delete camera:', err)
      alert('Failed to delete camera: ' + err.message)
    }
  }

  // Optics handlers
  const handleOpticSubmit = async (e) => {
    e.preventDefault()
    if (!opticForm.name.trim()) {
      alert('Please enter an optic name')
      return
    }

    const focalLength = parseFloat(opticForm.focalLength) || 0
    const aperture = parseFloat(opticForm.aperture) || 0
    const fRatio = aperture > 0 ? parseFloat((focalLength / aperture).toFixed(1)) : 0

    const opticData = {
      name: opticForm.name.trim(),
      focalLength,
      aperture: aperture || null,
      fRatio: fRatio || null,
      type: opticForm.type
    }

    try {
      if (editingId) {
        // Update existing optic
        const updated = await put(`/api/optics/${editingId}`, opticData)
        const optic = {
          id: updated.id,
          name: updated.name,
          focalLength: parseFloat(updated.focalLength) || 0,
          aperture: parseFloat(updated.aperture) || 0,
          fRatio: parseFloat(updated.fRatio) || 0,
          type: updated.type,
          isCustom: true
        }
        setCustomGear(prev => ({
          ...prev,
          optics: prev.optics.map(o => o.id === editingId ? optic : o)
        }))
      } else {
        // Create new optic
        const created = await post('/api/optics', opticData)
        const optic = {
          id: created.id,
          name: created.name,
          focalLength: parseFloat(created.focalLength) || 0,
          aperture: parseFloat(created.aperture) || 0,
          fRatio: parseFloat(created.fRatio) || 0,
          type: created.type,
          isCustom: true
        }
        setCustomGear(prev => ({
          ...prev,
          optics: [...(prev.optics || []), optic]
        }))
      }
      resetForms()
    } catch (err) {
      console.error('Failed to save optic:', err)
      alert('Failed to save optic: ' + err.message)
    }
  }

  const handleEditOptic = (optic) => {
    setOpticForm({
      name: optic.name,
      focalLength: optic.focalLength?.toString() || '',
      aperture: optic.aperture?.toString() || '',
      type: optic.type || 'refractor'
    })
    setEditingId(optic.id)
    setShowForm(true)
  }

  const handleDeleteOptic = async (id) => {
    if (!confirm('Delete this optic?')) return
    try {
      await del(`/api/optics/${id}`)
      setCustomGear(prev => ({
        ...prev,
        optics: prev.optics.filter(o => o.id !== id)
      }))
    } catch (err) {
      console.error('Failed to delete optic:', err)
      alert('Failed to delete optic: ' + err.message)
    }
  }

  // Setup handlers
  const handleSetupSubmit = async (e) => {
    e.preventDefault()
    if (!setupForm.name.trim() || !setupForm.cameraId || !setupForm.opticId) {
      alert('Please fill in all required fields')
      return
    }

    const camera = getAllCameras().find(c => c.id === setupForm.cameraId)
    const optic = getAllOptics().find(o => o.id === setupForm.opticId)

    if (!camera || !optic) {
      alert('Invalid camera or optic selection')
      return
    }

    const pixelScale = parseFloat(calculatePixelScale(camera.pixelSize, optic.focalLength))
    const fovWidth = parseFloat(calculateFOV(camera.sensorWidth, optic.focalLength))
    const fovHeight = parseFloat(calculateFOV(camera.sensorHeight, optic.focalLength))

    // Determine if camera/optic are custom (from API) or default
    const isCustomCamera = camera.isCustom
    const isCustomOptic = optic.isCustom

    const setupData = {
      name: setupForm.name.trim(),
      cameraId: isCustomCamera ? setupForm.cameraId : null,
      opticId: isCustomOptic ? setupForm.opticId : null,
      defaultCameraId: !isCustomCamera ? setupForm.cameraId : null,
      defaultOpticId: !isCustomOptic ? setupForm.opticId : null,
      focalLength: optic.focalLength,
      pixelScale,
      fovWidth,
      fovHeight,
      category: setupForm.category
    }

    try {
      if (editingId) {
        // Update existing setup
        const updated = await put(`/api/setups/${editingId}`, setupData)
        const setup = {
          id: updated.id,
          name: updated.name,
          camera: updated.cameraId || updated.defaultCameraId,
          optic: updated.opticId || updated.defaultOpticId,
          focalLength: parseFloat(updated.focalLength) || 0,
          pixelScale: parseFloat(updated.pixelScale) || 0,
          fov: {
            width: parseFloat(updated.fovWidth) || 0,
            height: parseFloat(updated.fovHeight) || 0
          },
          category: updated.category,
          isCustom: true
        }
        setCustomGear(prev => ({
          ...prev,
          setups: prev.setups.map(s => s.id === editingId ? setup : s)
        }))
      } else {
        // Create new setup
        const created = await post('/api/setups', setupData)
        const setup = {
          id: created.id,
          name: created.name,
          camera: created.cameraId || created.defaultCameraId,
          optic: created.opticId || created.defaultOpticId,
          focalLength: parseFloat(created.focalLength) || 0,
          pixelScale: parseFloat(created.pixelScale) || 0,
          fov: {
            width: parseFloat(created.fovWidth) || 0,
            height: parseFloat(created.fovHeight) || 0
          },
          category: created.category,
          isCustom: true
        }
        setCustomGear(prev => ({
          ...prev,
          setups: [...(prev.setups || []), setup]
        }))
      }
      resetForms()
    } catch (err) {
      console.error('Failed to save setup:', err)
      alert('Failed to save setup: ' + err.message)
    }
  }

  const handleEditSetup = (setup) => {
    setSetupForm({
      name: setup.name,
      cameraId: setup.camera,
      opticId: setup.optic,
      category: setup.category || 'main-rig'
    })
    setEditingId(setup.id)
    setShowForm(true)
  }

  const handleDeleteSetup = async (id) => {
    if (!confirm('Delete this setup?')) return
    try {
      await del(`/api/setups/${id}`)
      setCustomGear(prev => ({
        ...prev,
        setups: prev.setups.filter(s => s.id !== id)
      }))
    } catch (err) {
      console.error('Failed to delete setup:', err)
      alert('Failed to delete setup: ' + err.message)
    }
  }

  const setupCalcs = getSetupCalculations()

  return (
    <div className="gear-editor">
      <div className="gear-header">
        <h3>Gear Manager</h3>
        <button
          className="add-gear-button"
          onClick={() => { resetForms(); setShowForm(!showForm) }}
          disabled={loading}
        >
          {showForm ? 'Cancel' : '+ Add New'}
        </button>
      </div>

      {loading && (
        <div className="gear-loading">Loading gear...</div>
      )}

      {error && (
        <div className="gear-error">Error: {error}</div>
      )}

      {/* Sub-tabs for cameras/optics/setups */}
      <div className="gear-tabs">
        <button
          className={`gear-tab ${activeSection === 'cameras' ? 'active' : ''}`}
          onClick={() => { setActiveSection('cameras'); resetForms() }}
        >
          Cameras ({getAllCameras().length})
        </button>
        <button
          className={`gear-tab ${activeSection === 'optics' ? 'active' : ''}`}
          onClick={() => { setActiveSection('optics'); resetForms() }}
        >
          Optics ({getAllOptics().length})
        </button>
        <button
          className={`gear-tab ${activeSection === 'setups' ? 'active' : ''}`}
          onClick={() => { setActiveSection('setups'); resetForms() }}
        >
          Setups ({getAllSetups().length})
        </button>
      </div>

      {/* Camera Form */}
      {showForm && activeSection === 'cameras' && (
        <form className="gear-form" onSubmit={handleCameraSubmit}>
          <h4>{editingId ? 'Edit Camera' : 'Add New Camera'}</h4>

          <div className="form-group">
            <label>Camera Name *</label>
            <input
              type="text"
              value={cameraForm.name}
              onChange={(e) => setCameraForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., ZWO ASI294MC Pro"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Sensor Width (mm)</label>
              <input
                type="number"
                step="0.01"
                value={cameraForm.sensorWidth}
                onChange={(e) => setCameraForm(prev => ({ ...prev, sensorWidth: e.target.value }))}
                placeholder="e.g., 23.2"
              />
            </div>
            <div className="form-group">
              <label>Sensor Height (mm)</label>
              <input
                type="number"
                step="0.01"
                value={cameraForm.sensorHeight}
                onChange={(e) => setCameraForm(prev => ({ ...prev, sensorHeight: e.target.value }))}
                placeholder="e.g., 15.5"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Pixel Size (microns)</label>
              <input
                type="number"
                step="0.01"
                value={cameraForm.pixelSize}
                onChange={(e) => setCameraForm(prev => ({ ...prev, pixelSize: e.target.value }))}
                placeholder="e.g., 4.63"
              />
            </div>
            <div className="form-group">
              <label>Type</label>
              <select
                value={cameraForm.type}
                onChange={(e) => setCameraForm(prev => ({ ...prev, type: e.target.value }))}
              >
                <option value="cooled">Cooled</option>
                <option value="uncooled">Uncooled</option>
                <option value="dslr">DSLR/Mirrorless</option>
                <option value="integrated">Integrated</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Resolution Width (px)</label>
              <input
                type="number"
                value={cameraForm.resolutionWidth}
                onChange={(e) => setCameraForm(prev => ({ ...prev, resolutionWidth: e.target.value }))}
                placeholder="e.g., 4144"
              />
            </div>
            <div className="form-group">
              <label>Resolution Height (px)</label>
              <input
                type="number"
                value={cameraForm.resolutionHeight}
                onChange={(e) => setCameraForm(prev => ({ ...prev, resolutionHeight: e.target.value }))}
                placeholder="e.g., 2822"
              />
            </div>
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={cameraForm.color}
                onChange={(e) => setCameraForm(prev => ({ ...prev, color: e.target.checked }))}
              />
              Color camera (vs mono)
            </label>
          </div>

          <div className="form-actions">
            <button type="submit" className="submit-button">
              {editingId ? 'Update Camera' : 'Add Camera'}
            </button>
            <button type="button" className="cancel-button" onClick={resetForms}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Optics Form */}
      {showForm && activeSection === 'optics' && (
        <form className="gear-form" onSubmit={handleOpticSubmit}>
          <h4>{editingId ? 'Edit Optic' : 'Add New Optic'}</h4>

          <div className="form-group">
            <label>Optic Name *</label>
            <input
              type="text"
              value={opticForm.name}
              onChange={(e) => setOpticForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Celestron EdgeHD 8"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Focal Length (mm)</label>
              <input
                type="number"
                step="0.1"
                value={opticForm.focalLength}
                onChange={(e) => setOpticForm(prev => ({ ...prev, focalLength: e.target.value }))}
                placeholder="e.g., 2032"
              />
            </div>
            <div className="form-group">
              <label>Aperture (mm)</label>
              <input
                type="number"
                step="0.1"
                value={opticForm.aperture}
                onChange={(e) => setOpticForm(prev => ({ ...prev, aperture: e.target.value }))}
                placeholder="e.g., 203"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Type</label>
              <select
                value={opticForm.type}
                onChange={(e) => setOpticForm(prev => ({ ...prev, type: e.target.value }))}
              >
                <option value="refractor">Refractor</option>
                <option value="reflector">Reflector</option>
                <option value="camera-lens">Camera Lens</option>
              </select>
            </div>
            <div className="form-group">
              <label>F-Ratio (calculated)</label>
              <div className="calculated-field">
                f/{calculateFRatio(opticForm.focalLength, opticForm.aperture)}
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="submit-button">
              {editingId ? 'Update Optic' : 'Add Optic'}
            </button>
            <button type="button" className="cancel-button" onClick={resetForms}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Setup Form */}
      {showForm && activeSection === 'setups' && (
        <form className="gear-form" onSubmit={handleSetupSubmit}>
          <h4>{editingId ? 'Edit Setup' : 'Create New Setup'}</h4>

          <div className="form-group">
            <label>Setup Name *</label>
            <input
              type="text"
              value={setupForm.name}
              onChange={(e) => setSetupForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., My Main Imaging Rig"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Camera *</label>
              <select
                value={setupForm.cameraId}
                onChange={(e) => setSetupForm(prev => ({ ...prev, cameraId: e.target.value }))}
                required
              >
                <option value="">Select camera...</option>
                {getAllCameras().map(camera => (
                  <option key={camera.id} value={camera.id}>
                    {camera.name} {camera.isCustom ? '(custom)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Optic *</label>
              <select
                value={setupForm.opticId}
                onChange={(e) => setSetupForm(prev => ({ ...prev, opticId: e.target.value }))}
                required
              >
                <option value="">Select optic...</option>
                {getAllOptics().map(optic => (
                  <option key={optic.id} value={optic.id}>
                    {optic.name} ({optic.focalLength}mm) {optic.isCustom ? '(custom)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Category</label>
            <select
              value={setupForm.category}
              onChange={(e) => setSetupForm(prev => ({ ...prev, category: e.target.value }))}
            >
              <option value="main-rig">Main Rig</option>
              <option value="grab-and-go">Grab and Go</option>
              <option value="widefield">Widefield</option>
              <option value="planetary">Planetary</option>
            </select>
          </div>

          {/* Auto-calculated values */}
          {setupForm.cameraId && setupForm.opticId && (
            <div className="setup-calculations">
              <label>Calculated Values</label>
              <div className="calc-grid">
                <div className="calc-item">
                  <span className="calc-label">Pixel Scale</span>
                  <span className="calc-value">{setupCalcs.pixelScale} "/px</span>
                </div>
                <div className="calc-item">
                  <span className="calc-label">FOV Width</span>
                  <span className="calc-value">{setupCalcs.fovWidth}'</span>
                </div>
                <div className="calc-item">
                  <span className="calc-label">FOV Height</span>
                  <span className="calc-value">{setupCalcs.fovHeight}'</span>
                </div>
              </div>
            </div>
          )}

          <div className="form-actions">
            <button type="submit" className="submit-button">
              {editingId ? 'Update Setup' : 'Create Setup'}
            </button>
            <button type="button" className="cancel-button" onClick={resetForms}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Camera List */}
      {!showForm && activeSection === 'cameras' && (
        <div className="gear-list">
          {getAllCameras().length === 0 ? (
            <div className="empty-gear">
              <p>No cameras added yet.</p>
              <p>Click <strong>+ Add New</strong> to add your first camera!</p>
            </div>
          ) : (
            getAllCameras().map(camera => (
              <div key={camera.id} className={`gear-card ${camera.isCustom ? 'custom' : 'default'}`}>
                <div className="gear-card-header">
                  <div className="gear-card-name">{camera.name}</div>
                  <div className="gear-card-badge">
                    {camera.isCustom ? 'Custom' : 'Default'}
                  </div>
                </div>
                <div className="gear-card-details">
                  <span>Sensor: {camera.sensorWidth} x {camera.sensorHeight} mm</span>
                  <span>Pixel: {camera.pixelSize} um</span>
                  <span>Res: {camera.resolution?.width} x {camera.resolution?.height}</span>
                  <span>Type: {camera.type}</span>
                  <span>{camera.color ? 'Color' : 'Mono'}</span>
                </div>
                {camera.isCustom && (
                  <div className="gear-card-actions">
                    <button onClick={() => handleEditCamera(camera)}>Edit</button>
                    <button onClick={() => handleDeleteCamera(camera.id)}>Delete</button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Optics List */}
      {!showForm && activeSection === 'optics' && (
        <div className="gear-list">
          {getAllOptics().length === 0 ? (
            <div className="empty-gear">
              <p>No optics added yet.</p>
              <p>Click <strong>+ Add New</strong> to add your first optic!</p>
            </div>
          ) : (
            getAllOptics().map(optic => (
              <div key={optic.id} className={`gear-card ${optic.isCustom ? 'custom' : 'default'}`}>
                <div className="gear-card-header">
                  <div className="gear-card-name">{optic.name}</div>
                  <div className="gear-card-badge">
                    {optic.isCustom ? 'Custom' : 'Default'}
                  </div>
                </div>
                <div className="gear-card-details">
                  <span>FL: {optic.focalLength}mm</span>
                  <span>Aperture: {optic.aperture}mm</span>
                  <span>f/{optic.fRatio}</span>
                  <span>Type: {optic.type}</span>
                </div>
                {optic.isCustom && (
                  <div className="gear-card-actions">
                    <button onClick={() => handleEditOptic(optic)}>Edit</button>
                    <button onClick={() => handleDeleteOptic(optic.id)}>Delete</button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Setups List */}
      {!showForm && activeSection === 'setups' && (
        <div className="gear-list">
          {getAllSetups().length === 0 ? (
            <div className="empty-gear">
              <p>No custom setups created yet.</p>
              <p>Click <strong>+ Add New</strong> to pair a camera with an optic!</p>
            </div>
          ) : (
            getAllSetups().map(setup => {
              const camera = getAllCameras().find(c => c.id === setup.camera)
              const optic = getAllOptics().find(o => o.id === setup.optic)
              return (
                <div key={setup.id} className="gear-card custom">
                  <div className="gear-card-header">
                    <div className="gear-card-name">{setup.name}</div>
                    <div className="gear-card-badge">{setup.category}</div>
                  </div>
                  <div className="gear-card-details">
                    <span>Camera: {camera?.name || 'Unknown'}</span>
                    <span>Optic: {optic?.name || 'Unknown'}</span>
                  </div>
                  <div className="gear-card-calcs">
                    <span className="calc-highlight">
                      {setup.pixelScale?.toFixed(2)} "/px
                    </span>
                    <span className="calc-highlight">
                      FOV: {setup.fov?.width?.toFixed(0)}' x {setup.fov?.height?.toFixed(0)}'
                    </span>
                  </div>
                  <div className="gear-card-actions">
                    <button onClick={() => handleEditSetup(setup)}>Edit</button>
                    <button onClick={() => handleDeleteSetup(setup.id)}>Delete</button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

export default GearEditor
