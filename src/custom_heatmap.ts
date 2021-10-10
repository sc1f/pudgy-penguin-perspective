/* eslint-disable @typescript-eslint/no-namespace */

import type { View } from "@finos/perspective";

import type { PerspectiveViewerPluginElement } from "@finos/perspective-viewer";


function create_custom(name: string) {
    const D3fcHeatmap = customElements.get(`perspective-viewer-d3fc-${name}`) as typeof PerspectiveViewerPluginElement;
    class CustomHeatmap extends D3fcHeatmap {
        _style: HTMLStyleElement;

        constructor() {
            super();
            this._style = document.createElement("style");
            this._style.innerHTML = `
                line {
                    stroke: rgba(9, 33, 50) !important;
                    stroke-dasharray: 4,4 !important;
                }
            `;
        }

        async draw(view: View) {
            await super.draw(view);
            if (!this._style.isConnected) {
                this.shadowRoot?.appendChild(this._style);
            }
        }

        get name() {
            return `Custom ${name.slice(0, 1).toUpperCase() + name.slice(1)}`;
        }
    }

    customElements.define(`custom-${name}`, CustomHeatmap);
    customElements.get("perspective-viewer").registerPlugin(`custom-${name}`);
}

create_custom("heatmap");
create_custom("yline");
create_custom("ybar");