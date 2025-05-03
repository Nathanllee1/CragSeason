interface FeatureProperties {
    monthTicks: number[]; // Array of monthly tick counts
    totalTicks: number; // Total ticks at the location
    url: string; // URL slug for the location
    seasonMetric: number; // A metric for seasonality
    coordinates: Coordinates; // Latitude and longitude
    name: string; // Name of the location
}

interface Feature {
    type: "Feature";
    geometry: {
        type: "Point";
        coordinates: Coordinates;
    };
    properties: FeatureProperties;
}

export interface FeatureCollection {
    type: "FeatureCollection";
    features: Feature[];
}