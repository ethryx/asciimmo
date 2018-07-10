export interface ILogin {
  username: string
}

export interface ILoggedIn {
  id: string,
  username: string,
  style: string,
  canEdit: boolean
}

export interface IPlayerUpdate {
  id: string,
  username: string,
  map: string,
  x: number,
  y: number,
  style: string
}

export interface ILocation {
  x: number,
  y: number,
  shiftKey: boolean
}