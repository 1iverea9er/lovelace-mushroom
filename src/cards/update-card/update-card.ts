import { css, CSSResultGroup, html, TemplateResult } from "lit";
import { customElement, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { styleMap } from "lit/directives/style-map.js";
import {
    actionHandler,
    ActionHandlerEvent,
    computeRTL,
    handleAction,
    hasAction,
    HomeAssistant,
    isActive,
    isAvailable,
    LovelaceCard,
    LovelaceCardEditor,
    supportsFeature,
    UpdateEntity,
    updateIsInstalling,
    UPDATE_SUPPORT_INSTALL,
} from "../../ha";
import "../../shared/badge-icon";
import "../../shared/card";
import "../../shared/shape-icon";
import "../../shared/state-info";
import "../../shared/state-item";
import { computeAppearance } from "../../utils/appearance";
import { MushroomBaseCard } from "../../utils/base-card";
import { cardStyle } from "../../utils/card-styles";
import { registerCustomCard } from "../../utils/custom-cards";
import { stateIcon } from "../../utils/icons/state-icon";
import { computeEntityPicture } from "../../utils/info";
import { UPDATE_CARD_EDITOR_NAME, UPDATE_CARD_NAME, UPDATE_ENTITY_DOMAINS } from "./const";
import "./controls/update-buttons-control";
import { UpdateCardConfig } from "./update-card-config";
import { getStateColor } from "./utils";

registerCustomCard({
    type: UPDATE_CARD_NAME,
    name: "Mushroom Update Card",
    description: "Card for update entity",
});

@customElement(UPDATE_CARD_NAME)
export class UpdateCard extends MushroomBaseCard implements LovelaceCard {
    public static async getConfigElement(): Promise<LovelaceCardEditor> {
        await import("./update-card-editor");
        return document.createElement(UPDATE_CARD_EDITOR_NAME) as LovelaceCardEditor;
    }

    public static async getStubConfig(hass: HomeAssistant): Promise<UpdateCardConfig> {
        const entities = Object.keys(hass.states);
        const updates = entities.filter((e) => UPDATE_ENTITY_DOMAINS.includes(e.split(".")[0]));
        return {
            type: `custom:${UPDATE_CARD_NAME}`,
            entity: updates[0],
        };
    }

    @state() private _config?: UpdateCardConfig;

    getCardSize(): number | Promise<number> {
        return 1;
    }

    setConfig(config: UpdateCardConfig): void {
        this._config = {
            tap_action: {
                action: "more-info",
            },
            hold_action: {
                action: "more-info",
            },
            ...config,
        };
    }

    private _handleAction(ev: ActionHandlerEvent) {
        handleAction(this, this.hass!, this._config!, ev.detail.action!);
    }

    protected render(): TemplateResult {
        if (!this._config || !this.hass || !this._config.entity) {
            return html``;
        }

        const entityId = this._config.entity;
        const entity = this.hass.states[entityId] as UpdateEntity;

        const name = this._config.name || entity.attributes.friendly_name || "";
        const icon = this._config.icon || stateIcon(entity);
        const appearance = computeAppearance(this._config);
        const picture = computeEntityPicture(entity, appearance.icon_type);

        const rtl = computeRTL(this.hass);

        const displayControls =
            (!this._config.collapsible_controls || isActive(entity)) &&
            this._config.show_buttons_control &&
            supportsFeature(entity, UPDATE_SUPPORT_INSTALL);

        return html`
            <ha-card class=${classMap({ "fill-container": appearance.fill_container })}>
                <mushroom-card .appearance=${appearance} ?rtl=${rtl}>
                    <mushroom-state-item
                        ?rtl=${rtl}
                        .appearance=${appearance}
                        @action=${this._handleAction}
                        .actionHandler=${actionHandler({
                            hasHold: hasAction(this._config.hold_action),
                            hasDoubleClick: hasAction(this._config.double_tap_action),
                        })}
                    >
                        ${picture ? this.renderPicture(picture) : this.renderIcon(entity, icon)}
                        ${this.renderBadge(entity)}
                        ${this.renderStateInfo(entity, appearance, name)};
                    </mushroom-state-item>
                    ${displayControls
                        ? html`
                              <div class="actions" ?rtl=${rtl}>
                                  <mushroom-update-buttons-control
                                      .hass=${this.hass}
                                      .entity=${entity}
                                      .fill=${appearance.layout !== "horizontal"}
                                  ></mushroom-update-buttons-control>
                              </div>
                          `
                        : null}
                </mushroom-card>
            </ha-card>
        `;
    }

    protected renderIcon(entity: UpdateEntity, icon: string): TemplateResult {
        const isInstalling = updateIsInstalling(entity);

        const color = getStateColor(entity.state, isInstalling);

        const style = {
            "--icon-color": `rgb(${color})`,
            "--shape-color": `rgba(${color}, 0.2)`,
        };

        return html`
            <mushroom-shape-icon
                slot="icon"
                .disabled=${!isAvailable(entity)}
                .icon=${icon}
                class=${classMap({
                    pulse: isInstalling,
                })}
                style=${styleMap(style)}
            ></mushroom-shape-icon>
        `;
    }

    static get styles(): CSSResultGroup {
        return [
            super.styles,
            cardStyle,
            css`
                mushroom-state-item {
                    cursor: pointer;
                }
                mushroom-shape-icon {
                    --icon-color: rgb(var(--rgb-state-entity));
                    --shape-color: rgba(var(--rgb-state-entity), 0.2);
                }
                mushroom-shape-icon.pulse {
                    --shape-animation: 1s ease 0s infinite normal none running pulse;
                }
                mushroom-update-buttons-control {
                    flex: 1;
                }
            `,
        ];
    }
}
