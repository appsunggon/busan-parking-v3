export async function onRequestGet(context) {
  try {
    const serviceKey = context.env.PARKING_API_KEY;

    if (!serviceKey) {
      return Response.json(
        {
          error: "공공데이터 인증키가 설정되지 않았습니다."
        },
        {
          status: 500
        }
      );
    }

    const requestUrl = new URL(context.request.url);

    const parkingCode =
      requestUrl.searchParams.get("parkingCode");

    if (!parkingCode) {
      return Response.json(
        {
          error: "주차장 코드가 필요합니다."
        },
        {
          status: 400
        }
      );
    }

    const apiUrl = new URL(
      "https://apis.data.go.kr/B552587/ParkingInfoService_v2/getParkingInfoList_v2"
    );

    apiUrl.searchParams.set("serviceKey", serviceKey);
    apiUrl.searchParams.set("parkngcd", parkingCode);
    apiUrl.searchParams.set("pageNo", "1");
    apiUrl.searchParams.set("numOfRows", "10");
    apiUrl.searchParams.set("resultType", "json");

    const apiResponse = await fetch(apiUrl.toString(), {
      headers: {
        Accept: "application/json"
      }
    });

    const result = await apiResponse.text();

    return new Response(result, {
      status: apiResponse.status,

      headers: {
        "Content-Type":
          apiResponse.headers.get("Content-Type") ||
          "application/json; charset=utf-8",

        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    return Response.json(
      {
        error: "실시간 주차정보를 가져오지 못했습니다.",
        detail: error.message
      },
      {
        status: 500
      }
    );
  }
}