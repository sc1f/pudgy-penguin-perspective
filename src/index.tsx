/* eslint-disable @typescript-eslint/no-namespace */

import * as React from "react";
import * as ReactDOM from "react-dom";
import {useEffect, useRef} from "react";
import perspective, {Table} from "@finos/perspective";

import "@finos/perspective-viewer";
import "@finos/perspective-viewer-datagrid";
import "@finos/perspective-viewer-d3fc";
import "@finos/perspective-workspace";

import "./index.css";
import "@finos/perspective-workspace/dist/umd/material.css";

// Required because perspective-workspace doesn't export type declarations
declare global {
    namespace JSX {
        interface IntrinsicElements {
            "perspective-workspace": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
        }
    }
}

const worker = perspective.shared_worker();

const getTable = async (): Promise<Table> => {
    const req = fetch("./cleaned.arrow");
    const resp = await req;
    const buffer = await resp.arrayBuffer();
    return await worker.table(buffer as any);
};

const default_config: any = {
    detail: {
        main: {
            currentIndex: 0,
            type: "tab-area",
            widgets: [{table: "asset_events"}]
        }
    }
};

const CACHE: Record<number, HTMLCanvasElement> = {};

const makeCanvas = (asset_id: number, image: HTMLImageElement): HTMLCanvasElement => {
    const cached: HTMLCanvasElement | undefined = CACHE[asset_id];
    if (cached) return cached;

    const sx = (asset_id % 94) * 100;
    const sy = Math.floor(asset_id / 94) * 100;
    const canvas = document.createElement("canvas");
    canvas.height = 100;
    canvas.width = 100;
    const ctx = canvas.getContext("2d", {alpha: false});
    ctx?.drawImage(image, sx, sy, 100, 100, 0, 0, 100, 100);

    CACHE[asset_id] = canvas;
    return CACHE[asset_id];
};

/**
 * Given the large composite image, load the images into regular-table as the
 * left-most column and freeze it.
 * @param image
 */
const renderImage = (viewer: any, image: HTMLImageElement): void => {
    let table = viewer.getElementsByTagName("regular-table")[0];

    while (table === undefined) {
        console.log("looking...");
        table = viewer.getElementsByTagName("regular-table")[0];
    }

    // table.addEventListener("mousedown", (event: MouseEvent) => {
    //     const meta = table.getMeta(event.target);
    //     if (meta) {
    //         console.log(meta);
    //     }
    // });

    table.addStyleListener(() => {
        viewer.save().then((config: any) => {
            const html_table = table.children[0];
            const num_rows = html_table.rows.length;
            const rpidx = config["row_pivots"]?.indexOf("image");
            // const has_column_pivots = config["column_pivots"].contains("image");

            for (let ridx = 0; ridx < num_rows; ridx++) {
                const row = html_table.rows[ridx];

                for (let cidx = 0; cidx < row.cells.length; cidx++) {
                    const td = row.cells[cidx];
                    const meta = table.getMeta(td);

                    if (!meta) continue;

                    // Pivot column
                    if (rpidx !== -1 && cidx === rpidx && meta.row_header) {
                        if (ridx < 1) {
                            td.innerHTML = "";
                            continue;
                        }

                        const row_path = meta.row_header[rpidx + 1]?.toString();

                        if (!row_path) {
                            continue;
                        }

                        const asset_id = Number.parseInt(row_path);
                        td.innerHTML = "";
                        td.appendChild(makeCanvas(asset_id, image));
                    }

                    if (meta?.column_header?.length === 1 && meta.column_header[0] === "image" && ridx > 0) {
                        const asset_id = Number.parseInt(meta.value);
                        td.innerHTML = "";
                        td.appendChild(makeCanvas(asset_id, image));
                    }
                }
            }
        });
    });
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const Workspace = (): React.ReactElement => {
    const workspace = useRef<any>(null);

    useEffect(() => {
        if (workspace.current) {
            const config = window.localStorage.getItem("pudgy_penguins_perspective_workspace_config");
            workspace.current.addTable("asset_events", getTable());
            workspace.current.restore(config ? JSON.parse(config) : default_config);

            let setup_complete = false;

            workspace.current.addEventListener("workspace-layout-update", () => {
                if (!setup_complete) {
                    // Load the thumbnail image, and render each row with its
                    // own canvas inside renderImage().
                    const image: HTMLImageElement = new Image();
                    const canvas: HTMLCanvasElement = document.createElement("canvas");
                    canvas.setAttribute("style", "display:none;");

                    image.onload = (): void => {
                        console.log("eventlistener");

                        const viewers = workspace.current.getElementsByTagName("perspective-viewer");

                        for (const viewer of viewers) {
                            renderImage(viewer, image);
                        }
                    };

                    image.src = "./thumbnails.jpg";
                    setup_complete = true;
                    return;
                }

                workspace.current.save().then((config: any) => {
                    console.log("Saving to localStorage:", config);
                    window.localStorage.setItem("pudgy_penguins_perspective_workspace_config", JSON.stringify(config));
                });
            });
        }
    });

    return <perspective-workspace ref={workspace}></perspective-workspace>;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const App = (): React.ReactElement => {
    return (
        <div id="main" className="container">
            <Workspace />
        </div>
    );
};

window.addEventListener("load", () => {
    ReactDOM.render(<App />, document.getElementById("root"));
});
