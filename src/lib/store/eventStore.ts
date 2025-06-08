import ChartScene from "@/lib/chartScene";
import {
  Color,
  Group,
  LineBasicMaterial,
  LineLoop,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  Raycaster,
  Vector2,
} from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import MapShape from "../figures/MapShape";

class EventStore {
  eventMap: Record<
    string,
    (event: Event, mesh: Object3D | Group | Mesh | undefined) => void
  > = {};
  buildInEventMap: Record<
    string,
    (event: Event, mesh: Object3D | Group | Mesh | undefined) => void
  > = {};
  _chartScene: ChartScene;
  currentMesh: Mesh | null;
  currentBorderLine: LineLoop | Line2 | null = null; // 当前高亮的边界线
  currentColor: Color;
  areaColorNeedChange: boolean | undefined = false;
  borderHighlightEnabled: boolean = true; // 是否启用边界线高亮
  constructor(chartScene: ChartScene) {
    this._chartScene = chartScene;
    //需要hover事件
    this.areaColorNeedChange =
      this._chartScene.options.config &&
      this._chartScene.options.config.hoverRegionStyle &&
      this._chartScene.options.config.hoverRegionStyle.show;
    
    // 检查边界线高亮功能是否启用
    this.borderHighlightEnabled = 
      this._chartScene.options.config?.highlightBorderStyle?.show !== false;

    this.registerBuildInEventMap("mousemove", () => {
      // 重置之前的颜色
      if (this.areaColorNeedChange) {
        if (this.currentMesh) {
          (this.currentMesh.material as MeshBasicMaterial).color.set(
            this.currentMesh.userData.backupColor
          );
          (this.currentMesh.material as MeshBasicMaterial).opacity =
            this.currentMesh.userData.opacity;
        }
      }

      // 重置之前的边界线将在后续逻辑中处理
    });
  }
  registerEventMap(
    eventName: string,
    cb: (event: Event, mesh: Object3D | Group | Mesh | undefined) => void
  ) {
    this.eventMap[eventName] = cb;
    this._chartScene.options.dom.addEventListener(eventName, ((
      event: MouseEvent
    ) => {
      this.notification(event);
    }) as EventListener);
  }
  registerBuildInEventMap(eventName: string, cb: () => void) {
    let lastEventMesh: Mesh | null = null; // 跟踪上一次处理的网格对象

    this._chartScene.options.dom.addEventListener(eventName, ((
      event: MouseEvent
    ) => {
      const eventMesh = this.handleRaycaster(event);
      
      //说明hover的是地球
      if (eventMesh && eventMesh.type !== "TransformControlsPlane") {
        this._chartScene.earthHovered = true;
      } else {
        this._chartScene.earthHovered = false;
      }
      cb();
      
      // 处理国家区域高亮
      if (
        eventMesh &&
        eventMesh.userData.type === "country" &&
        this.areaColorNeedChange
      ) {
        // 检查是否与上一次是同一个网格对象
        if (lastEventMesh !== eventMesh) {
          console.log("Mouse moved to a different country or object");
          // 重置之前的高亮
          this.resetBorderHighlight();
          lastEventMesh = eventMesh;
        }

        this.buildInEventMap[eventName] = cb;
        this.currentMesh = eventMesh;
        (this.currentMesh.material as MeshBasicMaterial).color.set(
          this._chartScene.options.config!.hoverRegionStyle!.areaColor!
        );

        (this.currentMesh.material as MeshBasicMaterial).opacity =
          this._chartScene.options.config!.hoverRegionStyle!.opacity!;
          
        // 处理边界线高亮
        if (this.borderHighlightEnabled && eventMesh.name) {
          console.log("Hovering over country:", eventMesh.name);
          this.highlightCountryBorder(eventMesh.name);
        }
      } else {
        // 鼠标移出国家区域或没有检测到国家
        if (lastEventMesh) {
          console.log("Mouse left country area completely");
          lastEventMesh = null;
          this.currentMesh = null;
          
          // 确保重置所有边界线高亮
          this.resetBorderHighlight();
        }
      }
    }) as EventListener);
  }

  // 高亮指定国家的边界线
  highlightCountryBorder(countryName: string) {
    // 如果当前已经有高亮的边界线，先重置它
    if (this.currentBorderLine) {
      this.resetBorderHighlight();
    }
    
    let found = false;
    console.log("Looking for border of:", countryName);
    
    this._chartScene.mainContainer.traverse((object) => {
      // 查找边界线组
      if (object.name === `border-${countryName}` && object instanceof Group) {
        found = true;
        console.log("Found border group for:", countryName);
        
        // 在组中查找普通线和高亮线
        object.traverse((child) => {
          if (child.userData && child.userData.type === "countryBorder") {
            const normalLine = child as LineLoop;
            const line2Mesh = normalLine.userData.line2Mesh as Line2;
            
            if (line2Mesh) {
              // 使用 Line2 进行高亮显示
              this.currentBorderLine = line2Mesh;
              const line2Material = line2Mesh.material as LineMaterial;
              
              // 设置高亮颜色和线宽
              const highlightColor = normalLine.userData.highlightColor;
              const highlightWidth = normalLine.userData.highlightWidth;
              
              // 转换颜色格式
              let highlightColorValue: number;
              if (typeof highlightColor === 'string') {
                highlightColorValue = parseInt(highlightColor.replace('#', ''), 16);
              } else {
                highlightColorValue = highlightColor;
              }
              
              line2Material.color.set(highlightColorValue);
              line2Material.linewidth = highlightWidth;
              line2Material.needsUpdate = true;
              
              // 显示高亮线，隐藏普通线
              line2Mesh.visible = true;
              normalLine.visible = false;
              
              console.log(`Highlighted border for ${countryName} with color ${highlightColor} and width ${highlightWidth}`);
            }
          }
        });
      }
      
      // 保持兼容性：也查找直接的边界线对象
      if (
        object.userData && 
        object.userData.type === "countryBorder" && 
        object.userData.countryName === countryName
      ) {
        found = true;
        console.log("Found direct border for:", countryName);
        this.currentBorderLine = object as LineLoop;
        const material = this.currentBorderLine.material as LineBasicMaterial;
        
        // 设置高亮颜色
        const highlightColor = this._chartScene.options.config?.highlightBorderStyle?.color || "#ffffff";
        material.color.set(highlightColor);
        material.needsUpdate = true;
      }
    });
    
    if (!found) {
      console.log("Border not found for:", countryName);
    }
  }

  // 重置边界线高亮
  resetBorderHighlight() {
    console.log("Attempting to reset all border highlights");
    
    // 如果有当前高亮的边界线，直接处理它
    if (this.currentBorderLine) {
      console.log("Resetting current border highlight for:", this.currentBorderLine.userData?.countryName);
      
      if (this.currentBorderLine instanceof Line2) {
        // 处理 Line2 高亮重置
        const line2Mesh = this.currentBorderLine;
        const line2Material = line2Mesh.material as LineMaterial;
        
        // 重置到原始颜色
        const normalColor = line2Mesh.userData.normalColor || this._chartScene.options.config?.mapStyle?.lineColor || "#797eff";
        let normalColorValue: number;
        if (typeof normalColor === 'string') {
          normalColorValue = parseInt(normalColor.replace('#', ''), 16);
        } else {
          normalColorValue = normalColor;
        }
        line2Material.color.set(normalColorValue);
        line2Material.linewidth = 1; // 重置线宽
        line2Material.needsUpdate = true;
        
        // 隐藏高亮线
        line2Mesh.visible = false;
        
        // 找到对应的普通线并显示
        const parentGroup = line2Mesh.parent;
        if (parentGroup) {
          parentGroup.traverse((child) => {
            if (child.userData && child.userData.type === "countryBorder") {
              const normalLine = child as LineLoop;
              normalLine.visible = true;
              console.log("Restored normal border line for:", child.userData.countryName);
            }
          });
        }
      } else if (this.currentBorderLine instanceof LineLoop) {
        // 处理普通 LineLoop 高亮重置
        const material = this.currentBorderLine.material as LineBasicMaterial;
        const normalColor = this.currentBorderLine.userData.normalColor || this._chartScene.options.config?.mapStyle?.lineColor || "#797eff";
        material.color.set(normalColor);
        material.needsUpdate = true;
        console.log("Reset LineLoop border to normal color:", normalColor);
      }
      
      this.currentBorderLine = null;
    } else {
      // 如果没有当前高亮的边界线，尝试找出所有可能的高亮边界并重置它们
      console.log("No current border line to reset, checking all borders");
      
      // 遍历场景中的所有对象
      this._chartScene.mainContainer.traverse((object) => {
        // 检查并重置 Line2 类型的高亮边界
        if (object instanceof Line2 && object.userData && 
            (object.userData.type === "countryBorderHighlight" || object.userData.countryName)) {
          if (object.visible) {
            console.log("Found visible Line2 border to reset:", object.userData.countryName);
            object.visible = false;
            
            // 尝试找到对应的普通线并显示
            const parentGroup = object.parent;
            if (parentGroup) {
              parentGroup.traverse((child) => {
                if (child.userData && child.userData.type === "countryBorder") {
                  child.visible = true;
                }
              });
            }
          }
        }
        
        // 检查并重置 LineLoop 类型的边界
        if (object instanceof LineLoop && object.userData && object.userData.type === "countryBorder") {
          const material = object.material as LineBasicMaterial;
          // 只重置那些颜色被修改过的边界线
          if (material.color.getHex() !== 0x797eff) {
            const normalColor = object.userData.normalColor || "#797eff";
            console.log("Resetting LineLoop border color to:", normalColor);
            material.color.set(normalColor);
            material.needsUpdate = true;
            object.visible = true;
          }
        }
      });
    }
    
    console.log("Border highlight reset completed");
  }
  notification(event: MouseEvent) {
    const eventMesh = this.handleRaycaster(event);
    if (eventMesh) {
      this.eventMap[event.type](event, eventMesh);
    }
  }
  getMousePosition(event: MouseEvent) {
    const rect = this._chartScene.renderer.domElement.getBoundingClientRect();
    return {
      clientX: ((event.clientX - rect.left) / rect.width) * 2 - 1,
      clientY: -((event.clientY - rect.top) / rect.height) * 2 + 1,
    };
  }
  handleRaycaster(event: MouseEvent) {
    const mouse = this.getMousePosition(event);
    const Sx = mouse.clientX; //鼠标单击位置横坐标
    const Sy = mouse.clientY; //鼠标单击位置纵坐标
    //屏幕坐标转WebGL标准设备坐标
    const raycaster = new Raycaster();
    raycaster.setFromCamera(new Vector2(Sx, Sy), this._chartScene.camera);
    
    // 使用深度遍历确保我们检测mainContainer内的对象
    const intersects = raycaster.intersectObjects(
      this._chartScene.mainContainer.children,
      true
    );
    
    if (intersects.length > 0) {
      console.log("Intersection detected:", intersects[0].object.userData);
      return intersects[0].object as Mesh;
    }
    return undefined;
  }
}
export default EventStore;
