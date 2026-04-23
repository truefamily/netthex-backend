const readClientEnv = (name, { required = false, fallback = '' } = {}) => {
  const value = import.meta.env[name]

  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  if (required) {
    throw new Error(`Variable d'environnement client manquante: ${name}`)
  }

  return fallback
}

export const getRequiredClientEnv = (name) => readClientEnv(name, { required: true })

export const getOptionalClientEnv = (name, fallback = '') =>
  readClientEnv(name, { fallback })
