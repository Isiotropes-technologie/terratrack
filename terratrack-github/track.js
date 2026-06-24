// netlify/functions/track.js
exports.handler = async (event) => {
  const { number, carrier } = event.queryStringParameters || {};

  if (!number) {
    return {
      statusCode: 400,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Number required" })
    };
  }

  const API_KEY = process.env.SEVENTEEN_TRACK_API_KEY;

  if (!API_KEY) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "API key not configured" })
    };
  }

  try {
    const body = carrier 
      ? [{ number: number, carrier: carrier }]
      : [{ number: number }];

    const response = await fetch("https://api.17track.net/track/v2.4/query", {
      method: "POST",
      headers: {
        "17token": API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (data.data && data.data.accepted && data.data.accepted.length > 0) {
      const tracking = data.data.accepted[0];
      
      return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          success: true,
          data: {
            number: number,
            carrier: tracking.carrierName || carrier || 'Unknown',
            origin: { city: tracking.originCountry || 'Unknown' },
            destination: { city: tracking.destCountry || 'Unknown' },
            status: tracking.status || 'in_transit',
            progress: tracking.statusCode ? Math.round((tracking.statusCode / 100) * 100) : 50,
            currentEvent: {
              time: tracking.updateTime,
              description: tracking.statusText || tracking.status,
              location: tracking.location || 'Unknown'
            },
            estimatedDelivery: tracking.estimatedTime,
            events: tracking.trackings ? tracking.trackings.map(t => ({
              time: t.time,
              status: t.statusText,
              location: t.location
            })) : []
          }
        })
      };
    } else {
      return {
        statusCode: 404,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Tracking not found" })
      };
    }
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: error.message })
    };
  }
};