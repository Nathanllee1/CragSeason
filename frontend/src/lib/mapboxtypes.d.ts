export interface Point {
    type: string
    geometry: Geometry
    properties: Properties
    source: string
  }
  
  export interface Geometry {
    type: string
    coordinates: number[]
  }
  
  export interface Properties {
    name: string
    url: string
    loaded: boolean
    routeType: string
    total_ticks: number
    season_metric: number
  }
  