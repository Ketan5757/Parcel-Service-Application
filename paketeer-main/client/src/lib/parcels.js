"use server";

import clientPromise from "./mongodb";
import { read } from "./neo4j";

export async function findParcel(trackingId) {
	try {
		const client = await clientPromise;
		const db = client.db(process.env.MONGODB_NAME);

		const options = {
			projection: {
				id: { $toString: "$_id" },
				customerName: 1,
				trackingId: 1,
				status: 1,
				destinationAddress: 1,
				destinationGeo: 1,
				deliverableGeo: 1,
				sourceAddress: 1,
				sourceGeo: 1,
				lastLocation: 1,
				lastWarehouseId: 1,
				deliveryId: 1,
				_id: 0,
			},
		};

		const matchedParcel = await db.collection("parcels").findOne(
			{
				trackingId: Number(trackingId),
			},
			options
		);

		console.log(matchedParcel);
		if (matchedParcel) {
			return { results: matchedParcel, error: null, status: 400 };
		} else {
			return { results: null, error: "Parcel not found.", status: 200 };
		}
	} catch (error) {
		console.log("Parcel Data Fetch Error: ", error);
		return {
			results: null,
			error: "Parcel Data Fetch Error: " + error,
			status: 400,
		};
	}
}

export async function updateParcel(trackingIds, status, deliveryId) {
	try {
		const client = await clientPromise;
		const db = client.db(process.env.MONGODB_NAME);

		const trackingIdsList = Array.isArray(trackingIds)
			? trackingIds
			: [trackingIds];
		const filter = { trackingId: { $in: trackingIdsList } };

		const update = { $set: {} };

		// Update based on provided values (choose one or both)
		if (status) update.$set.status = status;
		if (deliveryId) update.$set.deliveryId = deliveryId;

		const result = await db.collection("parcels").updateMany(filter, update);
		console.log(result);

		if (result.matchedCount === 0) {
			// Parcel not found
			return {
				resultsAlt: null,
				errorAlt: "Parcel with tracking id not found.",
				status: 400,
			};
		} else if (result.modifiedCount === 0) {
			// Update failed (e.g., no change for the provided fields)
			return {
				resultsAlt: null,
				errorAlt: "Failed to update parcel. No changes made.",
				status: 500,
			};
		} else {
			const updatedCount = result.modifiedCount; // Store the number of updated parcels
			return {
				resultsAlt: `${updatedCount} parcel(s) updated successfully.`, // Adjust message based on count
				errorAlt: null,
				status: 200,
			};
		}
	} catch (error) {
		console.error("Update Parcel action error: ", error);
		return {
			resultsAlt: null,
			errorAlt: "Update Parcel action error: " + error.message,
			status: 500,
		};
	}
}

export async function createParcel(parcelData) {
	try {
		const client = await clientPromise;
		const db = client.db(process.env.MONGODB_NAME);
		const parcel = await db
			.collection("parcels")
			.findOne({ trackingId: parcelData.trackingId });

		if (parcel != null) {
			return {
				results: null,
				error: "Parcel with tracking id already exists.",
				status: 400,
			};
		}

		const deliverableGeo = await findDeliverableGeo(
			parcelData.destinationGeo.lat,
			parcelData.destinationGeo.lng
		);
		parcelData.deliverableGeo = deliverableGeo;

		const result = await db.collection("parcels").insertOne(parcelData);
		console.log("Parcel Creation Result: ", result);
		if (result.acknowledged) {
			if (
				parcelData.status == "PENDING DROPOFF" &&
				parcelData.lastWarehouseId
			) {
				const matchedWarehhouse = await db.collection("dhl").findOne({
					url: parcelData.lastWarehouseId,
				});

				if (matchedWarehhouse) {
					const filter = { _id: matchedWarehhouse._id };
					const update = { $inc: { occupiedSlots: 1 } };
					const result = await db.collection("dhl").updateOne(filter, update);
					console.log(result);
				}
			}

			return { results: "Parcel Created", error: null, status: 200 };
		} else {
			return { results: null, error: "Failed to create parcel.", status: 500 };
		}
	} catch (error) {
		console.log("Create Parcel action error: ", error);
		return {
			results: null,
			error: "Create Parcel action error: " + error,
			status: 400,
		};
	}
}

export async function fetchParcels(status, warehouseId) {
	try {
		const client = await clientPromise;
		const db = client.db(process.env.MONGODB_NAME);
		let query = {};
		if (status != "") {
			query.status = status;
		}

		if (warehouseId != "") {
			query.lastWarehouseId = warehouseId;
		}

		const options = {
			projection: {
				id: { $toString: "$_id" },
				customerName: 1,
				trackingId: 1,
				status: 1,
				destinationAddress: 1,
				destinationGeo: 1,
				deliverableGeo: 1,
				sourceAddress: 1,
				sourceGeo: 1,
				lastLocation: 1,
				lastWarehouseId: 1,
				_id: 0,
			},
		};

		const matchedParcels = await db
			.collection("parcels")
			.find(query, options)
			.toArray();

		console.log(matchedParcels);
		if (matchedParcels) {
			return { results: matchedParcels, error: null, status: 400 };
		} else {
			return { results: null, error: "No parcels found.", status: 200 };
		}
	} catch (error) {
		console.log("Parcel Data Fetch Error: ", error);
		return {
			results: null,
			error: "Parcel Data Fetch Error: " + error,
			status: 400,
		};
	}
}

export async function findDeliverableGeo(lat, lng) {
	const res = await read(
		`
        MATCH (n:RC)
        WITH n, point.distance(point({latitude: n.lat, longitude: n.lng}), point({latitude: $lat, longitude: $lng})) AS dist
        ORDER BY dist ASC
        LIMIT 1
        RETURN ID(n) as nodeId, n.lat AS closestLatitude, n.lng AS closestLongitude, dist AS distance
        `,
		{ lat: lat, lng: lng }
	);

	const record = res[0];
	const nodeId = record.nodeId.low;
	const closestLatitude = record.closestLatitude;
	const closestLongitude = record.closestLongitude;
	const distance = record.distance;

	return { nodeId, closestLatitude, closestLongitude, distance };
}
