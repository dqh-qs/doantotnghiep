// Dữ liệu GeoJSON các quận/huyện khu vực Đà Nẵng và Quảng Nam
// Dùng để tô màu toàn bộ vùng ranh giới theo chỉ số AQI tương tự như Lowcoder

export const DA_NANG_QUANG_NAM_GEOJSON = {
  type: "FeatureCollection",
  features: [
    // 1. Hòa Vang (Đà Nẵng) - Trạm #01
    {
      type: "Feature",
      properties: {
        id: 1,
        stationName: "Hoa Vang",
        name: "Huyện Hòa Vang",
        province: "TP. Đà Nẵng",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [108.05, 15.93],
            [107.92, 15.98],
            [107.88, 16.08],
            [107.96, 16.14],
            [108.08, 16.12],
            [108.12, 16.08],
            [108.16, 16.03],
            [108.18, 15.96],
            [108.14, 15.92],
            [108.05, 15.93],
          ],
        ],
      },
    },

    // 2. Cẩm Lệ (Đà Nẵng) - Trạm #02
    {
      type: "Feature",
      properties: {
        id: 2,
        stationName: "Cam Le",
        name: "Quận Cẩm Lệ",
        province: "TP. Đà Nẵng",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [108.16, 15.99],
            [108.22, 15.99],
            [108.23, 16.03],
            [108.18, 16.04],
            [108.16, 16.01],
            [108.16, 15.99],
          ],
        ],
      },
    },

    // 3. Ngũ Hành Sơn (Đà Nẵng) - Trạm #03
    {
      type: "Feature",
      properties: {
        id: 3,
        stationName: "Ngu Hanh Son",
        name: "Quận Ngũ Hành Sơn",
        province: "TP. Đà Nẵng",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [108.23, 15.97],
            [108.28, 15.97],
            [108.27, 16.04],
            [108.23, 16.04],
            [108.22, 16.00],
            [108.23, 15.97],
          ],
        ],
      },
    },

    // 4. Liên Chiểu (Đà Nẵng) - Trạm #04
    {
      type: "Feature",
      properties: {
        id: 4,
        stationName: "Lien Chieu",
        name: "Quận Liên Chiểu",
        province: "TP. Đà Nẵng",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [108.08, 16.12],
            [108.14, 16.16],
            [108.18, 16.13],
            [108.16, 16.07],
            [108.12, 16.08],
            [108.08, 16.12],
          ],
        ],
      },
    },

    // 5. Thanh Khê (Đà Nẵng) - Trạm #05
    {
      type: "Feature",
      properties: {
        id: 5,
        stationName: "Thanh Khe",
        name: "Quận Thanh Khê",
        province: "TP. Đà Nẵng",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [108.16, 16.05],
            [108.20, 16.05],
            [108.21, 16.07],
            [108.18, 16.08],
            [108.16, 16.05],
          ],
        ],
      },
    },

    // 6. Sơn Trà (Đà Nẵng) - Trạm #06
    {
      type: "Feature",
      properties: {
        id: 6,
        stationName: "Son Tra",
        name: "Quận Sơn Trà",
        province: "TP. Đà Nẵng",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [108.22, 16.05],
            [108.27, 16.05],
            [108.32, 16.11],
            [108.28, 16.14],
            [108.23, 16.10],
            [108.22, 16.05],
          ],
        ],
      },
    },

    // Hải Châu (Đà Nẵng)
    {
      type: "Feature",
      properties: {
        id: 6,
        stationName: "Son Tra",
        name: "Quận Hải Châu",
        province: "TP. Đà Nẵng",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [108.20, 16.03],
            [108.23, 16.03],
            [108.23, 16.07],
            [108.21, 16.07],
            [108.20, 16.03],
          ],
        ],
      },
    },

    // 7. Khâm Đức / Phước Sơn (Quảng Nam) - Trạm #07
    {
      type: "Feature",
      properties: {
        id: 7,
        stationName: "Kham Duc",
        name: "Huyện Phước Sơn (Khâm Đức)",
        province: "Tỉnh Quảng Nam",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [107.65, 15.28],
            [107.95, 15.30],
            [107.98, 15.52],
            [107.72, 15.55],
            [107.65, 15.42],
            [107.65, 15.28],
          ],
        ],
      },
    },

    // 8. Trà My (Bắc Trà My / Nam Trà My) - Trạm #08
    {
      type: "Feature",
      properties: {
        id: 8,
        stationName: "Tra My",
        name: "Huyện Bắc Trà My",
        province: "Tỉnh Quảng Nam",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [107.98, 15.10],
            [108.32, 15.15],
            [108.35, 15.42],
            [108.12, 15.45],
            [107.95, 15.35],
            [107.98, 15.10],
          ],
        ],
      },
    },

    // 9. Tiên Phước (Quảng Nam) - Trạm #09
    {
      type: "Feature",
      properties: {
        id: 9,
        stationName: "Tien Phuoc",
        name: "Huyện Tiên Phước",
        province: "Tỉnh Quảng Nam",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [108.18, 15.38],
            [108.36, 15.39],
            [108.37, 15.56],
            [108.22, 15.58],
            [108.18, 15.38],
          ],
        ],
      },
    },

    // 10. Đông Giang (Quảng Nam) - Trạm #10
    {
      type: "Feature",
      properties: {
        id: 10,
        stationName: "Dong Giang",
        name: "Huyện Đông Giang",
        province: "Tỉnh Quảng Nam",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [107.72, 15.75],
            [108.02, 15.78],
            [108.05, 15.93],
            [107.88, 16.02],
            [107.72, 15.92],
            [107.72, 15.75],
          ],
        ],
      },
    },

    // 11. Thanh Mỹ / Nam Giang (Quảng Nam) - Trạm #11
    {
      type: "Feature",
      properties: {
        id: 11,
        stationName: "Thanh My",
        name: "Huyện Nam Giang (Thanh Mỹ)",
        province: "Tỉnh Quảng Nam",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [107.50, 15.52],
            [107.92, 15.55],
            [107.95, 15.78],
            [107.72, 15.75],
            [107.55, 15.65],
            [107.50, 15.52],
          ],
        ],
      },
    },

    // 12. Quế Sơn / Nông Sơn (Quảng Nam) - Trạm #12
    {
      type: "Feature",
      properties: {
        id: 12,
        stationName: "Que Son",
        name: "Huyện Quế Sơn",
        province: "Tỉnh Quảng Nam",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [107.98, 15.58],
            [108.28, 15.60],
            [108.26, 15.75],
            [108.02, 15.76],
            [107.98, 15.58],
          ],
        ],
      },
    },

    // 13. Hà Lam / Thăng Bình (Quảng Nam) - Trạm #13
    {
      type: "Feature",
      properties: {
        id: 13,
        stationName: "Ha Lam",
        name: "Huyện Thăng Bình (Hà Lam)",
        province: "Tỉnh Quảng Nam",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [108.25, 15.62],
            [108.45, 15.63],
            [108.44, 15.82],
            [108.26, 15.79],
            [108.25, 15.62],
          ],
        ],
      },
    },

    // 14. Điện Bàn / Đại Lộc (Quảng Nam) - Trạm #14
    {
      type: "Feature",
      properties: {
        id: 14,
        stationName: "Quang Nam",
        name: "Thị xã Điện Bàn & Đại Lộc",
        province: "Tỉnh Quảng Nam",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [108.02, 15.76],
            [108.26, 15.78],
            [108.28, 15.94],
            [108.14, 15.93],
            [108.05, 15.85],
            [108.02, 15.76],
          ],
        ],
      },
    },

    // 15. Hội An (Quảng Nam) - Trạm #15
    {
      type: "Feature",
      properties: {
        id: 15,
        stationName: "Hoi An",
        name: "TP. Hội An",
        province: "Tỉnh Quảng Nam",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [108.28, 15.82],
            [108.38, 15.83],
            [108.40, 15.93],
            [108.30, 15.94],
            [108.28, 15.82],
          ],
        ],
      },
    },

    // Tam Kỳ & Núi Thành (Quảng Nam)
    {
      type: "Feature",
      properties: {
        id: 13,
        stationName: "Ha Lam",
        name: "TP. Tam Kỳ & Núi Thành",
        province: "Tỉnh Quảng Nam",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [108.36, 15.42],
            [108.65, 15.45],
            [108.62, 15.65],
            [108.42, 15.63],
            [108.36, 15.42],
          ],
        ],
      },
    },
  ],
};

