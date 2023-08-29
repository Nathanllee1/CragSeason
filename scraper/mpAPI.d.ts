export interface TickResponse {
    current_page:   number;
    data:           Datum[];
    first_page_url: string;
    from:           number;
    last_page:      number;
    last_page_url:  string;
    links:          Link[];
    next_page_url:  undefined | string;
    path:           string;
    per_page:       number;
    prev_page_url:  null;
    to:             number;
    total:          number;
}

export interface Datum {
    id:        number;
    date:      string;
    comment:   null;
    style:     string;
    leadStyle: string;
    pitches:   number;
    text:      string;
    createdAt: string;
    updatedAt: string;
    user:      boolean | UserClass;
}

export interface UserClass {
    id:   number;
    name: string;
}

export interface Link {
    url:    null | string;
    label:  string;
    active: boolean;
}
