export async function onRequestGet(context) {
  try {
    // Cloudflare에 등록한 비밀 인증키
    const serviceKey = context.env.PARKING_API_KEY;

    if (!serviceKey) {
      return Response.json(
        { error: "공공데이터 인증키가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    // 웹페이지에서 전달받은 페이지 정보
    const requestUrl = new URL(context.request.url);
    const pageNo = requestUrl.searchParams.get("pageNo") || "1";
    const numOfRows = requestUrl.searchParams.get("numOfRows") || "10";

    // 부산시설공단 공영주차장 목록 API
    const apiUrl = new URL(
      "https://apis.data.go.kr/B552587/ParkingInfoService_v2/getParkingList_v2"
    );

    apiUrl.searchParams.set("serviceKey", serviceKey);
    apiUrl.searchParams.set("pageNo", pageNo);
    apiUrl.searchParams.set("numOfRows", numOfRows);
    apiUrl.searchParams.set("resultType", "json");

    // 공공데이터 API 호출
    const apiResponse = await fetch(apiUrl.toString(), {
      headers: {
        Accept: "application/json",
      },
    });

    const result = await apiResponse.text();

    return new Response(result, {
      status: apiResponse.status,
      headers: {
        "Content-Type":
          apiResponse.headers.get("Content-Type") ||
          "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return Response.json(
      {
        error: "주차장 정보를 가져오지 못했습니다.",
        detail: error.message,
      },
      { status: 500 }
    );
  }
}