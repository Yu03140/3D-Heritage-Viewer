<!-- filepath: /Users/lalala/Documents/Code/GlobeStream3D/src/examples/BorderHighlight.vue -->
<script setup lang="ts">
import { onMounted } from "vue";
import earthFlyLine from "../lib";
import worldJson from "../map/world.json";

// 注册地图
earthFlyLine.registerMap("world", worldJson);

let chartInstance: any = null;

onMounted(() => {
  const dom = document.getElementById("container");
  if (dom) {
    // 创建地球实例
    chartInstance = earthFlyLine.init({
      dom,
      map: "world",
      autoRotate: true,
      mode: "3d",
      config: {
        R: 140,
        enableZoom: true,
        stopRotateByHover: true,
        earth: {
          color: "#13162c",
          dragConfig: {
            rotationSpeed: 1,
            inertiaFactor: 0.95,
          },
        },
        mapStyle: {
          areaColor: "#2e3564",
          lineColor: "#797eff",
          opacity: 1.0,
        },
        // 设置边界线高亮样式
        highlightBorderStyle: {
          color: "#ff6b6b", // 高亮时的颜色（改为更明显的红色）
          linewidth: 4,     // 高亮时的线宽
          show: true        // 启用高亮功能
        },
        // 设置区域高亮样式
        hoverRegionStyle: {
          areaColor: "#3a4080", // 高亮时的区域颜色
          opacity: 1,
          show: true
        },
        // 针对特定国家的样式配置
        regions: {
          China: {
            areaColor: "#2e3564",
            borderHighlight: true, // 启用特定国家的边界高亮
          },
          United: {
            areaColor: "#2e3564",
          }
        }
      },
    });
    
    // 添加一些示例数据点
    chartInstance.addData("point", [
      {
        lon: 116.4074,
        lat: 39.9042,
        value: 100,
        name: "北京"
      },
      {
        lon: -74.006,
        lat: 40.7128,
        value: 80,
        name: "纽约"
      },
      {
        lon: 139.6917,
        lat: 35.6895,
        value: 90,
        name: "东京"
      }
    ]);
    
    // 添加飞线
    chartInstance.addData("flyLine", [
      {
        from: {
          lon: 116.4074,
          lat: 39.9042,
        },
        to: {
          lon: -74.006,
          lat: 40.7128,
        }
      },
      {
        from: {
          lon: 116.4074,
          lat: 39.9042,
        },
        to: {
          lon: 139.6917,
          lat: 35.6895,
        }
      }
    ]);
  }
});
</script>

<template>
  <div style="position: relative; width: 100%; height: 100vh;">
    <div id="container"></div>
  </div>
</template>

<style>
#container {
  width: 100%;
  height: 100%;
  background-color: #040D21;
}
</style>
