"use client";

import { MapContainer, TileLayer, useMapEvents, Marker, Popup, Polyline, Circle } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import CustomMarker from './marker';

export default function LeafletMap({ locations, centreLocation, mapZoom, routeData, linesToRoad, liveLocation, refresh }) {
        
    return (
        <div className='flex h-full w-full bg-red-400 rounded-xl'>
            <MapContainer style={{
                height: '100%',
                width: '100%'
            }} center={centreLocation} zoom={mapZoom} scrollWheelZoom={true}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />
                {linesToRoad != null && (
                    <>
                        {linesToRoad.map((item, index) => (
                            <Polyline key={index} positions={item} color="blue" dashArray="5, 10" />
                        ))}
                    </>
                )}
                {routeData != null && (
                    <>
                        {routeData.map((item, index) => (
                            <Polyline key={index} positions={item.path} color="blue" />
                        ))}
                    </>
                )}
                {liveLocation != null && (
                    <div className="flex flex-wrap gap-2 md:pt-5 justify-center">
                        <CustomMarker type={liveLocation.type} locationLat={liveLocation.lat} locationLng={liveLocation.lng} popUpContent={` ${liveLocation.popUpContent} `} />
                    </div>
                )}
                {locations != null && (
                    <div className="flex flex-wrap gap-2 md:pt-5 justify-center">
                        {locations.map((item, index) => (
                            <CustomMarker key={index} type={item.type} locationLat={item.lat} locationLng={item.lng} popUpContent={` ${item.popUpContent} `} />
                        ))}
                    </div>
                )}
            </MapContainer>
        </div>
    )
}

