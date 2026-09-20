import { describe, expect, it } from 'vitest'
import {
  defaultStateHome,
  driverStateDirFor,
  normalizeRoot,
  projectKey,
} from '../src/state-dir.ts'

describe('projectKey', () => {
  it('reproduces the key of a live driver state directory', () => {
    // Observed live: the driver reported this directory for this root.
    expect(projectKey('C:\\Users\\Stella\\chibipop', 'win32')).toBe('chibipop-f4e64fe7eff5')
  })

  it('normalizes a Windows root before hashing', () => {
    const canonical = projectKey('C:\\Users\\Stella\\chibipop', 'win32')
    expect(projectKey('c:/users/stella/chibipop/', 'win32')).toBe(canonical)
    expect(projectKey('C:\\Users\\Stella\\chibipop\\', 'win32')).toBe(canonical)
  })

  it('keeps case on a POSIX root', () => {
    // Every expectation in this block is the driver function's own output.
    expect(projectKey('/home/Stella/Proj', 'linux')).toBe('Proj-b38e755eb656')
  })

  it('replaces characters a directory name cannot hold', () => {
    expect(projectKey('/home/stella/my project', 'linux')).toBe('my_project-4b85e03e6db3')
  })

  it('names a filesystem root without an empty segment', () => {
    expect(projectKey('/', 'linux')).toBe('_-8a5edab28263')
    expect(projectKey('C:\\', 'win32')).toBe('c_-508e9f1d9b22')
  })

  it('reproduces a second live state directory', () => {
    expect(projectKey('C:\\Users\\Stella\\dsh-vn', 'win32')).toBe('dsh-vn-e3761816c7ce')
  })
})

describe('normalizeRoot', () => {
  it('strips trailing separators but keeps a bare root', () => {
    expect(normalizeRoot('/home/stella/', 'linux')).toBe('/home/stella')
    expect(normalizeRoot('/', 'linux')).toBe('/')
    expect(normalizeRoot('C:\\', 'win32')).toBe('c:/')
  })
})

describe('defaultStateHome', () => {
  it('prefers the driver environment override', () => {
    expect(defaultStateHome({ IMOUTO_STATE_HOME: 'D:\\state' }, 'C:\\Users\\Stella', 'win32'))
      .toBe('D:\\state')
  })

  it('falls back to the projects directory under the home directory', () => {
    expect(defaultStateHome({}, 'C:\\Users\\Stella', 'win32'))
      .toBe('C:\\Users\\Stella\\.imouto\\projects')
  })

  it('treats an empty override as unset', () => {
    expect(defaultStateHome({ IMOUTO_STATE_HOME: '' }, '/home/stella', 'linux'))
      .toBe('/home/stella/.imouto/projects')
  })
})

describe('driverStateDirFor', () => {
  it('joins the state home and the project key', () => {
    expect(driverStateDirFor('C:\\Users\\Stella\\chibipop', { home: 'C:\\Users\\Stella', platform: 'win32' }))
      .toBe('C:\\Users\\Stella\\.imouto\\projects\\chibipop-f4e64fe7eff5')
  })

  it('honors an explicit state home over the environment', () => {
    expect(driverStateDirFor('/repo', {
      home: '/home/stella',
      platform: 'linux',
      env: { IMOUTO_STATE_HOME: '/mnt/state' },
    })).toBe(`/mnt/state/repo-${projectKey('/repo', 'linux').split('-')[1]}`)
  })
})
