"use server";

import clientPromise from "./mongodb";
import { read } from "./neo4j";
import { findDeliverableGeo } from "./parcels";

export async function findDelivery(deliveryId) {
	try {
		const client = await clientPromise;
		const db = client.db(process.env.MONGODB_NAME);

		const options = {
			projection: {
				id: { $toString: "$_id" },
				deliveryId: 1,
				status: 1,
				parcels: 1,
				warehouseId: 1,
                sourceGeo: 1,
                route: 1,
				_id: 0,
			},
		};

		const matchedDelivery = await db.collection("delivery").findOne(
			{
				deliveryId: Number(deliveryId),
			},
			options
		);

		if (matchedDelivery) {
			return { results: matchedDelivery, error: null, status: 400 };
		} else {
			return { results: null, error: "Delivery not found.", status: 200 };
		}
	} catch (error) {
		console.log("Delivery Data Fetch Error: ", error);
		return {
			results: null,
			error: "Delivery Data Fetch Error: " + error,
			status: 400,
		};
	}
}

export async function createDelivery(deliveryData) {
	try {
		const client = await clientPromise;
		const db = client.db(process.env.MONGODB_NAME);
		const parcel = await db
			.collection("delivery")
			.findOne({ deliveryId: deliveryData.deliveryId });
		if (parcel != null) {
			return {
				results: null,
				error: "A record with delivery id already exists.",
				status: 400,
			};
		}
        
		deliveryData.route = await calculateDeliveryRoute(
			deliveryData.sourceGeo,
			deliveryData.parcels
		);

		const result = await db.collection("delivery").insertOne(deliveryData);
		// console.log("Delivery Creation Result: ", result);
		if (result.acknowledged) {
			return { results: "Delivery Created", error: null, status: 200 };
		} else {
			return {
				results: null,
				error: "Failed to create Delivery record.",
				status: 500,
			};
		}
	} catch (error) {
		console.log("Create Delivery action error: ", error);
		return {
			results: null,
			error: "Create Delivery action error: " + error,
			status: 400,
		};
	}
}

export async function fetchDeliveryRecords(status, warehouseId) {
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
				deliveryId: 1,
				status: 1,
				parcels: 1,
				warehouseId: 1,
                route: 1,
                sourceGeo: 1,
				_id: 0,
			},
		};

		const matchedDeliveries = await db
			.collection("delivery")
			.find(query, options)
			.toArray();

		console.log(matchedDeliveries);
		if (matchedDeliveries) {
			return { results: matchedDeliveries, error: null, status: 400 };
		} else {
			return {
				results: null,
				error: "No delivery records found.",
				status: 200,
			};
		}
	} catch (error) {
		console.log("Delivery Data Fetch Error: ", error);
		return {
			results: null,
			error: "Delivery Data Fetch Error: " + error,
			status: 400,
		};
	}
}


export async function updateDelivery(deliveryId, status, parcelData) {
	try {
		const client = await clientPromise;
		const db = client.db(process.env.MONGODB_NAME);

		const filter = { deliveryId };
		const update = { $set: {} };

		// Update based on provided values (choose one or both)
		if (status) update.$set.status = status;
		if (parcelData) update.$set.parcels = parcelData;

        console.log(filter);
		const result = await db.collection("delivery").updateMany(filter, update);
        console.log(result);

		if (result.matchedCount === 0) {
			// Parcel not found
			return {
				results: null,
				error: "Delivery record with id not found.",
				status: 400,
			};
		} else if (result.modifiedCount === 0) {
			// Update failed (e.g., no change for the provided fields)
			return {
				results: null,
				error: "Failed to update delivery record. No changes made.",
				status: 500,
			};
		} else {
			const updatedCount = result.modifiedCount; // Store the number of updated parcels
			return {
				results: `${updatedCount} delivery record(s) updated successfully.`, // Adjust message based on count
				error: null,
				status: 200,
			};
		}
	} catch (error) {
		console.error("Update Delivery record action error: ", error);
		return {
			results: null,
			error: "Update Delivery record action error: " + error.message,
			status: 500,
		};
	}
}

async function calculateDeliveryRoute(sourceGeo, parcelList) {
    let calculatedRoute = [];
	console.log(sourceGeo);
    const startNode = await findDeliverableGeo(sourceGeo.lat, sourceGeo.lng);
	let stopNodes = {};
    let stopNodeDirectCosts = {};
    let nextNodeId = null;
    for(let idx = 0; idx < parcelList.length; idx++){
        let stopNode = await findDeliverableGeo(parcelList[idx].destinationGeo.lat, parcelList[idx].destinationGeo.lng);
        stopNodes[stopNode.nodeId] = stopNode;
        if(nextNodeId == null) nextNodeId = stopNode.nodeId;

        let stopNodeCost = await calculateRouteCost(startNode, stopNode);
        stopNodeDirectCosts[stopNode.nodeId] = stopNodeCost;
        stopNodeDirectCosts[stopNode.nodeId].trackingId = parcelList[idx].trackingId;

        if(stopNodeCost.totalCost < stopNodeDirectCosts[nextNodeId].totalCost){
            nextNodeId = stopNode.nodeId;
        }
    }
    calculatedRoute.push(stopNodeDirectCosts[nextNodeId]);
    delete stopNodeDirectCosts[nextNodeId];

    while( Object.keys(stopNodeDirectCosts).length > 0){
        let startNodeId = nextNodeId;
        for( let nodeId in stopNodeDirectCosts){
            let stopNodeCost = await calculateRouteCost(stopNodes[startNodeId], stopNodes[nodeId]);
            if(nextNodeId == null || nextNodeId == startNodeId) nextNodeId = nodeId;
            
            let trackingId = stopNodeDirectCosts[nodeId].trackingId;
            stopNodeDirectCosts[nodeId] = stopNodeCost;
            stopNodeDirectCosts[nodeId].trackingId = trackingId;
    
            if(stopNodeCost.totalCost < stopNodeDirectCosts[nextNodeId].totalCost){
                nextNodeId = nodeId;
            }
        }
        calculatedRoute.push(stopNodeDirectCosts[nextNodeId]);
        delete stopNodeDirectCosts[nextNodeId]; 
    }

    return calculatedRoute;
}

async function calculateRouteCost(startNode, endNode) {
	const res = await read(
		`
        MATCH (start)
        WHERE id(start) = $startNodeId
        MATCH (end)
        WHERE id(end) = $endNodeId

        CALL gds.shortestPath.dijkstra.stream(
        'routeGraph',
        {
            sourceNode: start,
            targetNode: end,
            relationshipWeightProperty: 'distance'
        }
        )
        YIELD
        index,
        sourceNode,
        targetNode,
        totalCost,
        path
        RETURN
        index,
        totalCost,
        nodes(path) AS path
        ORDER BY index

        `,
		{ startNodeId: startNode.nodeId, endNodeId: endNode.nodeId }
	);

	const record = res[0];
	const totalCost = record.totalCost;
    const path = record.path.map((item) => [item.properties.lat, item.properties.lng]);

	return { totalCost, path };
}

