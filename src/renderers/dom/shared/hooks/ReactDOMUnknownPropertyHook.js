/**
 * Copyright 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule ReactDOMUnknownPropertyHook
 */

'use strict';

var DOMProperty = require('DOMProperty');
var EventPluginRegistry = require('EventPluginRegistry');

if (__DEV__) {
  var warning = require('fbjs/lib/warning');
  var {
    ReactComponentTreeHook,
    ReactDebugCurrentFrame,
  } = require('ReactGlobalSharedState');
  var {getStackAddendumByID} = ReactComponentTreeHook;
}

function getStackAddendum(debugID) {
  if (debugID != null) {
    // This can only happen on Stack
    return getStackAddendumByID(debugID);
  } else {
    // This can only happen on Fiber / Server
    var stack = ReactDebugCurrentFrame.getStackAddendum();
    return stack != null ? stack : '';
  }
}

if (__DEV__) {
  var warnedProperties = {};
  var EVENT_NAME_REGEX = /^on[A-Z]/;
  var possibleStandardNames = require('possibleStandardNames');

  var validateProperty = function(tagName, name, value, debugID) {
    var lowerCasedName = name.toLowerCase();

    if (warnedProperties.hasOwnProperty(name) && warnedProperties[name]) {
      return true;
    }

    warnedProperties[name] = true;

    if (EventPluginRegistry.registrationNameModules.hasOwnProperty(name)) {
      return true;
    }

    if (
      EventPluginRegistry.plugins.length === 0 &&
      EVENT_NAME_REGEX.test(name)
    ) {
      // If no event plugins have been injected, we might be in a server environment.
      // Don't check events in this case.
      return true;
    }

    var registrationName = EventPluginRegistry.possibleRegistrationNames.hasOwnProperty(
      lowerCasedName,
    )
      ? EventPluginRegistry.possibleRegistrationNames[lowerCasedName]
      : null;

    if (registrationName != null) {
      warning(
        false,
        'Unknown event handler property %s. Did you mean `%s`?%s',
        name,
        registrationName,
        getStackAddendum(debugID),
      );
      return true;
    }

    // data-* attributes should be lowercase; suggest the lowercase version
    var standardName = possibleStandardNames.hasOwnProperty(name)
      ? possibleStandardNames[name]
      : null;

    var hasBadCasing = standardName != null && standardName !== name;

    if (DOMProperty.shouldSetAttribute(name, value) && !hasBadCasing) {
      return true;
    }

    if (standardName != null) {
      warning(
        false,
        'Unknown DOM property %s. Did you mean %s?%s',
        name,
        standardName,
        getStackAddendum(debugID),
      );
      return true;
    }

    return DOMProperty.isReservedProp(name);
  };
}

var warnUnknownProperties = function(type, props, debugID) {
  var unknownProps = [];
  for (var key in props) {
    var isValid = validateProperty(type, key, props[key], debugID);
    if (!isValid) {
      unknownProps.push(key);
    }
  }

  var unknownPropString = unknownProps.map(prop => '`' + prop + '`').join(', ');

  if (unknownProps.length === 1) {
    warning(
      false,
      'Unknown prop %s on <%s> tag. Either remove this prop from the element, ' +
        'or pass a string, number, or boolean value to keep it in the DOM. ' +
        'For details, see https://fb.me/react-unknown-prop%s',
      unknownPropString,
      type,
      getStackAddendum(debugID),
    );
  } else if (unknownProps.length > 1) {
    warning(
      false,
      'Unknown props %s on <%s> tag. Either remove these props from the element, ' +
        'or pass a string, number, or boolean value to keep them in the DOM. ' +
        'For details, see https://fb.me/react-unknown-prop%s',
      unknownPropString,
      type,
      getStackAddendum(debugID),
    );
  }
};

function validateProperties(type, props, debugID /* Stack only */) {
  if (type.indexOf('-') >= 0 || props.is) {
    return;
  }
  warnUnknownProperties(type, props, debugID);
}

var ReactDOMUnknownPropertyHook = {
  // Fiber
  validateProperties,
  // Stack
  onBeforeMountComponent(debugID, element) {
    if (__DEV__ && element != null && typeof element.type === 'string') {
      validateProperties(element.type, element.props, debugID);
    }
  },
  onBeforeUpdateComponent(debugID, element) {
    if (__DEV__ && element != null && typeof element.type === 'string') {
      validateProperties(element.type, element.props, debugID);
    }
  },
};

module.exports = ReactDOMUnknownPropertyHook;
