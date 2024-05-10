import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
	return twMerge(clsx(inputs));
}

export function findMidpoint(mapData) {
	// Check if mapData has any elements
	if (!mapData.length) return null;

	// Initialize variables
	let sumLat = 0;
	let sumLng = 0;

	// Loop through mapData and accumulate lat/lng sums
	for (const point of mapData) {
		sumLat += point.lat;
		sumLng += point.lng;
	}

	// Calculate average (midpoint)
	const averageLat = sumLat / mapData.length;
	const averageLng = sumLng / mapData.length;

	// Return the midpoint object
	return { lat: averageLat, lng: averageLng };
}
