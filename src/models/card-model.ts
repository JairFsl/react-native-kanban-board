import { View } from "react-native";
import { Rect } from "./rect";

export class CardModel {
  private _ref: View | null = null;
  private _hidden: boolean = false;
  private _rect: Rect | undefined;
  private _isLocked: boolean = false;
  private _isRenderedAndVisible: boolean = false;
  private _invalidated: boolean = false;

  id: string;
  columnId: string;
  columnName: string;
  title: string;
  contato: string;
  placa: string;
  anoModelo: string;
  modelo: string;
  subtitle: string;
  data: string;
  status: string;
  sortOrder: number;

  get ref(): View | null {
    return this._ref;
  }

  get isHidden(): boolean {
    return this._hidden;
  }

  get dimensions(): Rect | undefined {
    return this._rect;
  }

  get isLocked(): boolean {
    return this._isLocked;
  }

  get isRenderedAndVisible(): boolean {
    return this._isRenderedAndVisible;
  }

  get isInvalidated(): boolean {
    return this._invalidated;
  }

  /**
   * Creates a new CardModel instance.
   * @param {string} id - The ID of the card.
   * @param {string} columnId - The ID of the column the card belongs to.
   * @param {string} columnName - The name of the column the card belongs to.
   * @param {string} title - The title of the card.
   * @param {string} contato - The subtitle of the card.
   * @param {string} placa - The subtitle of the card.
   * @param {string} anoModelo - The subtitle of the card.
   * @param {string} modelo - The subtitle of the card.
   * @param {string} subtitle - The subtitle of the card.
   * @param {string} data - The subtitle of the card.
   * @param {string} status - The subtitle of the card.
   * @param {number} sortOrder - The sort order of the card within its column.
   */
  constructor(
    id: string,
    columnId: string,
    columnName: string,
    title: string,
    contato: string,
    placa: string,
    anoModelo: string,
    modelo: string,
    subtitle: string,
    data: string,
    status: string,
    sortOrder: number
  ) {
    this.id = id;
    this.columnId = columnId;
    this.columnName = columnName;
    this.title = title;
    this.contato = contato;
    this.placa = placa;
    this.anoModelo = anoModelo;
    this.modelo = modelo;
    this.subtitle = subtitle;
    this.data = data;
    this.status = status;
    this.sortOrder = sortOrder;
  }

  setRef(ref: View | null) {
    this._ref = ref;
  }

  validateAndMeasure() {
    if (!this._ref) {
      this._rect = undefined;
      return;
    }

    this._ref.measure((_x, _y, width, height, pageX, pageY) => {
      this._rect = { x: pageX, y: pageY, width, height };

      if (
        !this._isRenderedAndVisible &&
        this._rect.x &&
        this._rect.y &&
        this._rect.width &&
        this._rect.height
      ) {
        this.setIsRenderedAndVisible(true);
      } else if (
        this._isRenderedAndVisible &&
        !this._rect.x &&
        !this._rect.y &&
        !this._rect.width &&
        !this._rect.height
      ) {
        this.setIsRenderedAndVisible(false);
      }

      this._invalidated = false;
    });
  }

  setDimensions(dimensions: Rect | undefined) {
    this._rect = dimensions;
  }

  setIsRenderedAndVisible(visible: boolean) {
    this._isRenderedAndVisible = visible;
  }

  hide() {
    this._hidden = true;
  }

  show() {
    this._hidden = false;
  }

  invalidate() {
    this._invalidated = true;
  }
}
