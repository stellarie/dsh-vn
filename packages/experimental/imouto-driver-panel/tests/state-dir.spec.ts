import { describe, expect, it } from 'vitest'
import {
  defaultStateHome,
  driverStateDirFor,
  normalizeRoot,
  projectKey,
} from '../src/state-dir.ts'

describe('projectKey', () => {
  it('reproduces the driver key rule for a Windows root', () => {
    expect(projectKey('C:\\projects\\example', 'win32')).toBe('example-f55557f7711b')
  })

  it('normalizes a Windows root before hashing', () => {
    const canonical = projectKey('C:\\projects\\example', 'win32')
    expect(projectKey('c:/projects/example/', 'win32')).toBe(canonical)
    expect(projectKey('C:\\projects\\example\\', 'win32')).toBe(canonical)
  })

  it('keeps case on a POSIX root', () => {
    expect(projectKey('/home/you/Proj', 'linux')).toBe('Proj-4f21c565dc95')
  })

  it('replaces characters a directory name cannot hold', () => {
    expect(projectKey('/home/you/my project', 'linux')).toBe('my_project-06857d039a89')
  })

  it('names a filesystem root without an empty segment', () => {
    expect(projectKey('/', 'linux')).toBe('_-8a5edab28263')
    expect(projectKey('C:\\', 'win32')).toBe('c_-508e9f1d9b22')
  })

  it('reproduces the key rule for a second root', () => {
    expect(projectKey('C:\\projects\\second', 'win32')).toBe('second-bada71fda9a1')
  })
})

describe('normalizeRoot', () => {
  it('strips trailing separators but keeps a bare root', () => {
    expect(normalizeRoot('/home/you/', 'linux')).toBe('/home/you')
    expect(normalizeRoot('/', 'linux')).toBe('/')
    expect(normalizeRoot('C:\\', 'win32')).toBe('c:/')
  })
})

describe('defaultStateHome', () => {
  it('prefers the driver environment override', () => {
    expect(defaultStateHome({ IMOUTO_STATE_HOME: 'D:\\state' }, 'C:\\Users\\you', 'win32'))
      .toBe('D:\\state')
  })

  it('falls back to the projects directory under the home directory', () => {
    expect(defaultStateHome({}, 'C:\\Users\\you', 'win32'))
      .toBe('C:\\Users\\you\\.imouto\\projects')
  })

  it('treats an empty override as unset', () => {
    expect(defaultStateHome({ IMOUTO_STATE_HOME: '' }, '/home/you', 'linux'))
      .toBe('/home/you/.imouto/projects')
  })
})

describe('driverStateDirFor', () => {
  it('joins the state home and the project key', () => {
    expect(driverStateDirFor('C:\\projects\\example', { home: 'C:\\Users\\you', platform: 'win32' }))
      .toBe('C:\\Users\\you\\.imouto\\projects\\example-f55557f7711b')
  })

  it('honors an explicit state home over the environment', () => {
    expect(driverStateDirFor('/repo', {
      home: '/home/you',
      platform: 'linux',
      env: { IMOUTO_STATE_HOME: '/mnt/state' },
    })).toBe(`/mnt/state/repo-${projectKey('/repo', 'linux').split('-')[1]}`)
  })
})
