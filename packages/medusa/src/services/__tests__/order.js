import { IdMap } from "medusa-test-utils"
import { OrderModelMock, orders } from "../../models/__mocks__/order"
import OrderService from "../order"
import { PaymentProviderServiceMock } from "../__mocks__/payment-provider"
import { FulfillmentProviderServiceMock } from "../__mocks__/fulfillment-provider"
import { ShippingProfileServiceMock } from "../__mocks__/shipping-profile"
import { TotalsServiceMock } from "../__mocks__/totals"

describe("OrderService", () => {
  describe("create", () => {
    const orderService = new OrderService({
      orderModel: OrderModelMock,
    })

    beforeEach(async () => {
      jest.clearAllMocks()
    })

    it("calls order model functions", async () => {
      await orderService.create({
        email: "oliver@test.dk",
      })

      expect(OrderModelMock.create).toHaveBeenCalledTimes(1)
      expect(OrderModelMock.create).toHaveBeenCalledWith({
        email: "oliver@test.dk",
      })
    })
  })

  describe("retrieve", () => {
    let result
    const orderService = new OrderService({
      orderModel: OrderModelMock,
    })

    beforeAll(async () => {
      jest.clearAllMocks()
      result = await orderService.retrieve(IdMap.getId("test-order"))
    })

    it("calls order model functions", async () => {
      expect(OrderModelMock.findOne).toHaveBeenCalledTimes(1)
      expect(OrderModelMock.findOne).toHaveBeenCalledWith({
        _id: IdMap.getId("test-order"),
      })
    })

    it("returns correct order", async () => {
      expect(result._id).toEqual(IdMap.getId("test-order"))
    })
  })

  describe("update", () => {
    const orderService = new OrderService({
      orderModel: OrderModelMock,
    })

    beforeEach(async () => {
      jest.clearAllMocks()
    })

    it("calls order model functions", async () => {
      await orderService.update(IdMap.getId("test-order"), {
        email: "oliver@test.dk",
      })

      expect(OrderModelMock.updateOne).toHaveBeenCalledTimes(1)
      expect(OrderModelMock.updateOne).toHaveBeenCalledWith(
        { _id: IdMap.getId("test-order") },
        {
          $set: {
            email: "oliver@test.dk",
          },
        },
        { runValidators: true }
      )
    })

    it("throws on invalid billing address", async () => {
      const address = {
        last_name: "James",
        address_1: "24 Dunks Drive",
        city: "Los Angeles",
        country_code: "US",
        province: "CA",
        postal_code: "93011",
      }

      try {
        await orderService.update(IdMap.getId("test-order"), {
          billing_address: address,
        })
      } catch (err) {
        expect(err.message).toEqual("The address is not valid")
      }

      expect(OrderModelMock.updateOne).toHaveBeenCalledTimes(0)
    })

    it("throws on invalid shipping address", async () => {
      const address = {
        last_name: "James",
        address_1: "24 Dunks Drive",
        city: "Los Angeles",
        country_code: "US",
        province: "CA",
        postal_code: "93011",
      }

      try {
        await orderService.update(IdMap.getId("test-order"), {
          shipping_address: address,
        })
      } catch (err) {
        expect(err.message).toEqual("The address is not valid")
      }

      expect(OrderModelMock.updateOne).toHaveBeenCalledTimes(0)
    })

    it("throws if metadata update are attempted", async () => {
      try {
        await orderService.update(IdMap.getId("test-order"), {
          metadata: { test: "foo" },
        })
      } catch (error) {
        expect(error.message).toEqual(
          "Use setMetadata to update metadata fields"
        )
      }
    })

    it("throws if address updates are attempted after fulfillment", async () => {
      try {
        await orderService.update(IdMap.getId("fulfilled-order"), {
          billing_address: {
            first_name: "Lebron",
            last_name: "James",
            address_1: "24 Dunks Drive",
            city: "Los Angeles",
            country_code: "US",
            province: "CA",
            postal_code: "93011",
          },
        })
      } catch (error) {
        expect(error.message).toEqual(
          "Can't update shipping, billing, items and payment method when order is processed"
        )
      }
    })

    it("throws if payment method update is attempted after fulfillment", async () => {
      try {
        await orderService.update(IdMap.getId("fulfilled-order"), {
          payment_method: {
            provider_id: "test",
            profile_id: "test",
          },
        })
      } catch (error) {
        expect(error.message).toEqual(
          "Can't update shipping, billing, items and payment method when order is processed"
        )
      }
    })

    it("throws if items update is attempted after fulfillment", async () => {
      try {
        await orderService.update(IdMap.getId("fulfilled-order"), {
          items: [],
        })
      } catch (error) {
        expect(error.message).toEqual(
          "Can't update shipping, billing, items and payment method when order is processed"
        )
      }
    })
  })

  describe("cancel", () => {
    const orderService = new OrderService({
      orderModel: OrderModelMock,
    })

    beforeEach(async () => {
      jest.clearAllMocks()
    })

    it("calls order model functions", async () => {
      await orderService.cancel(IdMap.getId("not-fulfilled-order"))

      expect(OrderModelMock.updateOne).toHaveBeenCalledTimes(1)
      expect(OrderModelMock.updateOne).toHaveBeenCalledWith(
        { _id: IdMap.getId("not-fulfilled-order") },
        { $set: { status: "cancelled" } }
      )
    })

    it("throws if order is fulfilled", async () => {
      try {
        await orderService.cancel(IdMap.getId("fulfilled-order"))
      } catch (error) {
        expect(error.message).toEqual("Can't cancel a fulfilled order")
      }
    })

    it("throws if order payment is captured", async () => {
      try {
        await orderService.cancel(IdMap.getId("payed-order"))
      } catch (error) {
        expect(error.message).toEqual(
          "Can't cancel an order with payment processed"
        )
      }
    })
  })

  describe("capturePayment", () => {
    const orderService = new OrderService({
      orderModel: OrderModelMock,
      paymentProviderService: PaymentProviderServiceMock,
    })

    beforeEach(async () => {
      jest.clearAllMocks()
    })

    it("calls order model functions", async () => {
      await orderService.capturePayment(IdMap.getId("test-order"))

      expect(OrderModelMock.updateOne).toHaveBeenCalledTimes(1)
      expect(OrderModelMock.updateOne).toHaveBeenCalledWith(
        { _id: IdMap.getId("test-order") },
        { $set: { payment_status: "captured" } }
      )
    })

    it("throws if payment is already processed", async () => {
      try {
        await orderService.capturePayment(IdMap.getId("payed-order"))
      } catch (error) {
        expect(error.message).toEqual("Payment already captured")
      }
    })
  })

  describe("createFulfillment", () => {
    const orderService = new OrderService({
      orderModel: OrderModelMock,
      paymentProviderService: PaymentProviderServiceMock,
      fulfillmentProviderService: FulfillmentProviderServiceMock,
      shippingProfileService: ShippingProfileServiceMock,
    })

    beforeEach(async () => {
      jest.clearAllMocks()
    })

    it("calls order model functions", async () => {
      await orderService.createFulfillment(IdMap.getId("test-order"))

      expect(OrderModelMock.updateOne).toHaveBeenCalledTimes(1)
      expect(OrderModelMock.updateOne).toHaveBeenCalledWith(
        { _id: IdMap.getId("test-order") },
        { $set: { fulfillment_status: "fulfilled" } }
      )
    })

    it("throws if payment is already processed", async () => {
      try {
        await orderService.createFulfillment(IdMap.getId("fulfilled-order"))
      } catch (error) {
        expect(error.message).toEqual("Order is already fulfilled")
      }
    })
  })

  describe("return", () => {
    const orderService = new OrderService({
      orderModel: OrderModelMock,
      paymentProviderService: PaymentProviderServiceMock,
      totalsService: TotalsServiceMock,
    })

    beforeEach(async () => {
      jest.clearAllMocks()
    })

    it("calls order model functions", async () => {
      await orderService.return(IdMap.getId("processed-order"), [
        {
          _id: IdMap.getId("existingLine"),
          title: "merge line",
          description: "This is a new line",
          thumbnail: "test-img-yeah.com/thumb",
          content: {
            unit_price: 123,
            variant: {
              _id: IdMap.getId("can-cover"),
            },
            product: {
              _id: IdMap.getId("validId"),
            },
            quantity: 1,
          },
          quantity: 10,
        },
      ])

      expect(OrderModelMock.updateOne).toHaveBeenCalledTimes(1)
      expect(OrderModelMock.updateOne).toHaveBeenCalledWith(
        { _id: IdMap.getId("processed-order") },
        {
          $set: {
            items: [
              {
                _id: IdMap.getId("existingLine"),
                content: {
                  product: {
                    _id: IdMap.getId("validId"),
                  },
                  quantity: 1,
                  unit_price: 123,
                  variant: {
                    _id: IdMap.getId("can-cover"),
                  },
                },
                description: "This is a new line",
                quantity: 10,
                returned_quantity: 10,
                thumbnail: "test-img-yeah.com/thumb",
                title: "merge line",
              },
            ],
            fulfillment_status: "returned",
          },
        }
      )
    })

    it("calls order model functions and sets partially_fulfilled", async () => {
      await orderService.return(IdMap.getId("order-refund"), [
        {
          _id: IdMap.getId("existingLine"),
          title: "merge line",
          description: "This is a new line",
          thumbnail: "test-img-yeah.com/thumb",
          content: {
            unit_price: 100,
            variant: {
              _id: IdMap.getId("eur-8-us-10"),
            },
            product: {
              _id: IdMap.getId("product"),
            },
            quantity: 1,
          },
          quantity: 2,
        },
      ])

      expect(OrderModelMock.updateOne).toHaveBeenCalledTimes(1)
      expect(OrderModelMock.updateOne).toHaveBeenCalledWith(
        { _id: IdMap.getId("order-refund") },
        {
          $set: {
            items: [
              {
                _id: IdMap.getId("existingLine"),
                content: {
                  product: {
                    _id: IdMap.getId("product"),
                  },
                  quantity: 1,
                  unit_price: 100,
                  variant: {
                    _id: IdMap.getId("eur-8-us-10"),
                  },
                },
                description: "This is a new line",
                quantity: 10,
                returned_quantity: 2,
                thumbnail: "test-img-yeah.com/thumb",
                title: "merge line",
              },
              {
                _id: IdMap.getId("existingLine2"),
                title: "merge line",
                description: "This is a new line",
                thumbnail: "test-img-yeah.com/thumb",
                content: {
                  unit_price: 100,
                  variant: {
                    _id: IdMap.getId("can-cover"),
                  },
                  product: {
                    _id: IdMap.getId("product"),
                  },
                  quantity: 1,
                },
                quantity: 10,
              },
            ],
            fulfillment_status: "partially_fulfilled",
          },
        }
      )
    })

    it("throws if payment is already processed", async () => {
      try {
        await orderService.return(IdMap.getId("fulfilled-order"))
      } catch (error) {
        expect(error.message).toEqual(
          "Can't return an order with payment unprocessed"
        )
      }
    })

    it("throws if return is attempted on unfulfilled order", async () => {
      try {
        await orderService.return(IdMap.getId("not-fulfilled-order"))
      } catch (error) {
        expect(error.message).toEqual(
          "Can't return an unfulfilled or already returned order"
        )
      }
    })
  })

  describe("archive", () => {
    const orderService = new OrderService({
      orderModel: OrderModelMock,
    })

    beforeEach(async () => {
      jest.clearAllMocks()
    })

    it("calls order model functions", async () => {
      await orderService.archive(IdMap.getId("processed-order"))

      expect(OrderModelMock.updateOne).toHaveBeenCalledTimes(1)
      expect(OrderModelMock.updateOne).toHaveBeenCalledWith(
        { _id: IdMap.getId("processed-order") },
        { $set: { status: "archived" } }
      )
    })

    it("throws if order is unprocessed", async () => {
      try {
        await orderService.archive(IdMap.getId("test-order"))
      } catch (error) {
        expect(error.message).toEqual("Can't archive an unprocessed order")
      }
    })
  })
})