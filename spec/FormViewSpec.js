/*globals Marionette, beforeEach, $, require, jasmine, describe, it, expect, loadFixtures, Backbone*/

describe("FormView", function () {
  "use strict";
  var stopSubmit,
      readySpy,
      runInitializersSpy,
      submitSpy,
      submitFailSpy,
      validationErrorSpy;

  beforeEach(function () {
    loadFixtures("formTemplate.html", "nestedFormTemplate.html");
    stopSubmit = function(e) {
      e.preventDefault();
      return false;
    };

    readySpy = jasmine.createSpy('onReady');
    runInitializersSpy = jasmine.createSpy('runInitializers');
    submitSpy = jasmine.createSpy('onSubmit').andCallFake(stopSubmit);
    submitFailSpy = jasmine.createSpy('onSubmitFail');
    validationErrorSpy = jasmine.createSpy('onValidationFail');
  });

  it("Should create a base model from data and fields", function () {
    var fieldsHash = {
        fname : {
          el : ".fname"
        }
      },
      dataHash = {
        fname : 'test'
      };

    var form = new (Marionette.FormView.extend({
      template : "#form-template",
      data     : dataHash,
      fields   : fieldsHash
    }))();
    form.render();

    expect(form.model.get('fname')).toBe(dataHash.fname);
  });

  it('should Call runInitializers when form is rendered', function () {
    var form = new (Marionette.FormView.extend({
      template : "#form-template",
      data     : {},
      fields   : {},
      runInitializers: runInitializersSpy
    }))();
    form.render();

    expect(form.runInitializers).toHaveBeenCalled();
  });

  it("Should populate fields from model", function () {
    var fieldsHash = {
        fname : {
          el : ".fname"
        },
        about: {},
        status: {}
      };
    var model = new Backbone.Model();
    model.set({
      fname: 'foo',
      about: 'this is a description',
      status: 'active'
    });

    var form = new (Marionette.FormView.extend({
      template : "#form-template",
      fields   : fieldsHash,
      model    : model
    }))();
    form.render();

    expect(form.$('[data-field="fname"]').val()).toEqual(model.get('fname'));
    expect(form.$('[data-field="about"]').val()).toEqual(model.get('about'));
    var radioButtons = form.$('[data-field="status"]');
    radioButtons.each(function(){
      var button = $(this);
      if (button.val() === model.get('status')){
        expect(button).toBeChecked();
      } else {
        expect(button).not.toBeChecked();
      }
    });
  });

  it("Should Call onSubmit upon form submit click", function () {
    var form = new (Marionette.FormView.extend({
      template : "#form-template",
      onSubmit : submitSpy
    }))();
    form.render();
    form.$('input[type=submit]').click();

    expect(submitSpy).toHaveBeenCalled();
  });

  it("Should Call OnSubmit upon formview.submit()", function () {
    var form = new (Marionette.FormView.extend({
      template : "#form-template",
      onSubmit : submitSpy
    }))();
    form.render();
    form.submit();

    expect(submitSpy).toHaveBeenCalled();
  });

  it("Should call external submit event upon formview.submit()", function () {
    var form = new (Marionette.FormView.extend({
      template : "#form-template",
      fields   : {
        fname : {
          el : ".fname"
        }
      }
    }))();
    form.render();
    form.form.submit(submitSpy);
    form.submit();

    expect(submitSpy).toHaveBeenCalled();
  });

  it("Should Call OnSubmit upon actual form submission", function () {
    var form = new (Marionette.FormView.extend({
      template : "#form-template",
      onSubmit : submitSpy
    }))();
    form.render();
    form.form.submit();

    expect(submitSpy).toHaveBeenCalled();
  });

  it("Should call onSubmitError when a field does not pass validation", function () {
    var form = new (Marionette.FormView.extend({
      template : "#form-template",
      fields : {
        fname : {
          el       : '.fname',
          required : true
        }
      },
      onSubmit : submitSpy,
      onSubmitFail : submitFailSpy
    }))();
    form.render();
    form.submit();

    expect(submitFailSpy).toHaveBeenCalled();
    expect(submitSpy).not.toHaveBeenCalled();
  });

  it("Should call onSubmitFail but not onSubmit and not actually submit when a field does not pass validation", function () {
    var form = new (Marionette.FormView.extend({
      template : "#form-template",
      fields : {
        fname : {
          el       : '.fname',
          required : true
        }
      },
      onSubmit : submitSpy,
      onSubmitFail : submitFailSpy
    }))();
    form.render();
    form.form.on('submit',submitSpy);
    form.submit();

    expect(submitFailSpy).toHaveBeenCalledWith({
      fname : {
        el : '.fname',
        error : ['This field is required'],
        field : 'fname'
      }
    });
    expect(submitSpy).not.toHaveBeenCalled();
  });

  describe('Validating on input events',function(){
    // Trying to generalize event testing.
    function createEventSpec(event) {
      return function(){
        var form = new (Backbone.Marionette.FormView.extend({
          template : "#form-template",
          fields   : {
            fname : {
              el       : ".fname",
              required : true,
              validateOn : event
            }
          },
          onValidationFail : validationErrorSpy,
          onSubmitFail : submitFailSpy,
          onSubmit : submitSpy
        }))();

        form.render();

        form.$('[data-field="fname"]').trigger(event);

        expect(validationErrorSpy).toHaveBeenCalledWith({
          el : '.fname',
          error : ['This field is required'],
          field : 'fname'
        });
        expect(submitFailSpy).not.toHaveBeenCalled();
        expect(submitSpy).not.toHaveBeenCalled();
      };
    }

    it("Should call field errors on field blur", createEventSpec('blur'));
    it("Should call field errors on field keyup", createEventSpec('keyup'));
    it("Should call field errors on field keydown", createEventSpec('keydown'));
    it("Should call field errors on field change", createEventSpec('change'));
  });

  it("Should Call OnReady when form is attached and ready", function () {
    var form = new (Marionette.FormView.extend({
      template : "#form-template",
      onReady : readySpy
    }))();

    form.render();
    expect(readySpy).toHaveBeenCalled();
  });

  describe('serialization', function() {
    it("Should populate and serialize nested form data", function(){
      var model = new Backbone.Model({
        address: {
          street: '123 Test Street',
          city: 'Fakeville',
          state: 'CA',
          zip: '11111',
          instructions: 'leave in hallway'
        },
        items: [
          'item one',
          'item two',
          'item three'
        ]
      });
      var fields = {
        address: {
          el: '.address'
        },
        items: {
          el: '.items'
        }
      };
      var form = new (Marionette.FormView.extend({
        template: '#nested-form-template',
        fields: fields,
        model: model
      }))();
      form.render();
      var serialized = form.serializeFormData();
      expect(serialized).toEqual(model.toJSON());
    });

    it('should trim whitespace except for on passwords', function() {
      var model = new Backbone.Model({
        fname: ' SpaceInFront',
        lname: 'SpaceInBack ',
        pass1: ' space in front',
        pass2: 'space in back ',
        about: '        Lots of whitespace goes here                    '
      });
      var fields = {
        fname: {
          el: '.fname'
        },
        lname: {
          el: '.lname'
        },
        pass1: {
          el: '.pass1'
        },
        pass2: {
          el: '.pass2'
        },
        about: {
          el: '.about'
        }
      };
      var form = new (Marionette.FormView.extend({
        template: '#form-template',
        model: model,
        fields: fields
      }))();
      form.render();
      var serialized = form.serializeFormData();
      expect(serialized.fname).toEqual('SpaceInFront');
      expect(serialized.lname).toEqual('SpaceInBack');
      expect(serialized.pass1).toEqual(' space in front');
      expect(serialized.pass2).toEqual('space in back ');
      expect(serialized.about).toEqual('Lots of whitespace goes here');
    });
  });

  it("Should allow a model.clear() with options other than {changes : obj}", function() {

    var model = new Backbone.Model({
      address: {
        street: '123 Test Street',
        city: 'Fakeville',
        state: 'CA',
        zip: '11111'
      }
    });

    var fields = {
      address: {
        el: '.address'
      }
    };

    var form = new (Marionette.FormView.extend({
      template: '#nested-form-template',
      fields: fields,
      model: model
    }))().render();

    expect(form.model.get('address')).toBeTruthy();
    form.model.clear();
    expect(form.model.get('address')).toBeUndefined();
  });

  it("should default inputType to text if type attribute not specified in the el", function(){
    var model = new Backbone.Model({
      notype: 'test'
    });

    var fields = {
      notype: {
        el: '.notype'
      }
    };

    var form = new (Marionette.FormView.extend({
      model: model,
      template: '#form-template',
      fields: fields
    }))().render();

    expect(form.$('input[data-field="notype"]').prop('type')).toEqual('text');
    var serialized = form.serializeFormData();
    expect(serialized.notype).toEqual('test');
  });

});
