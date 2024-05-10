"use client";
import { Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import MarkerShadow from '../../node_modules/leaflet/dist/images/marker-shadow.png'

const markerIconTypeMap = {
    "DEFAULT": "/images/warehouse.png",
    "WAREHOUSE": "/images/warehouse.png",
    "DESTINATION": "/images/destination.png",
    "DESTINATION MAIN": "/images/destination.png",
    "DESTINATION DROPOFF": "/images/parcel-dropoff.png",
    "DESTINATION PICKUP": "/images/parcel-pickup.png",
    "LIVE LOCATION": "/images/onroute.png",
    "LOCKER": "/images/packstation.png",
    "POSTBOX": "/images/packstation.png",
    "POSTBANK": "/images/packstation.png",
    "POBOX": "/images/warehouse.png",
    "POSTOFFICE": "/images/warehouse.png",
    "SERVICEPOINT": "/images/warehouse.png"
}

export default function CustomMarker({ type, locationLat, locationLng, popUpContent }) {

    if (type == undefined || type == null) {
        type = "DEFAULT";
    }

    let markerIcon = new L.Icon({
        iconUrl: markerIconTypeMap[type],
        iconRetinaUrl: markerIconTypeMap[type],
        iconSize: [35, 35],
        iconAnchor: type == "LIVE LOCATION" ? [18, 18] : [12.5, 41],
        popupAnchor: type == "LIVE LOCATION" ? [0, -17] : [0, -41],
        shadowUrl: MarkerShadow.src,
        shadowSize: [40, 40],
    })

    return (
        <Marker icon={markerIcon} position={[locationLat, locationLng]}>
            <Popup>
                {popUpContent}
            </Popup>
        </Marker>
    );
}

