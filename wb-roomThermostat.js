// Контрол с которого снимается комнатная температура
var controlTermometr = 'wb-w1/28-00000dde6e29';
// Контрол, которому присваивается уставка отопления
var controlHeatingSetpoint = 'wbe2-i-ebus_12/Heating Setpoint';
// Контрол с коротого считывается состояние контуров котла
var controlBoilerStatus = 'wbe2-i-ebus_12/Boiler Status';

// Еще константы

// Периодичность расчета уставки отпопления
var calculationPeriod = 10;
// Максимальная уставка отопления
var maxHeatingSetpoint = 65;
// Минимальный шаг изменения уставки
var stepSetpoint = 1;
// Минимальная разница между уставкой комнатной температуры и уставкой отпления
var targetDifference = 5;
// Точность комнатной температуры
var roomTemperatureAccuracy = 0.1;

defineVirtualDevice('roomThermostat', {
    title: 'Комнатный термостат (газового котла)' ,
    cells: {
      roomTemperature: {
        title: 'Комнатная температура',
        order: 5,
	    type: 'value',
        units: 'deg C',
        value: 21
	    },
      roomTemperatureSetpoint: {
        title: 'Уставка комнатной температуры',
	    type: 'value',
        units: 'deg C',
        readonly: false,
        order: 10,
	    value: 21,
        max: 30,
        min: 15
	    },
      gisterezis: {
        title: 'Погрешность поддержания ',
	    type: 'value',
        readonly: false,
        order: 20,
	    value: 1,
        units: 'deg C',
        enum: {
          1: {ru: '+/- 0.5'},
          2: {ru: '+/- 1'}
          }
	    },
      log: {
        title: 'Лог:',
	    type: 'text',
        order: 90,
        value: ''
	    },
      log0: {
        title: '-',
	    type: 'text',
        order: 100,
        value: ''
	    },
      log1: {
        title: '-',
	    type: 'text',
        order: 110,
        value: ''
	    },
      log2: {
        title: '-',
	    type: 'text',
        order: 120,
        value: ''
	    },
      log3: {
        title: '-',
	    type: 'text',
        order: 130,
        value: ''
	    },
      log4: {
        title: '-',
	    type: 'text',
        order: 140,
        value: ''
	    },
      log5: {
        title: '-',
	    type: 'text',
        order: 150,
        value: ''
	    },
      log6: {
        title: '-',
	    type: 'text',
        order: 160,
        value: ''
	    },
      log7: {
        title: '-',
	    type: 'text',
        order: 170,
        value: ''
	    },
      log8: {
        title: '-',
	    type: 'text',
        order: 180,
        value: ''
	    },
      log9: {
        title: '-',
	    type: 'text',
        order: 190,
        value: ''
	    }
    }
});

var draftRoomTemperature = dev[controlTermometr];
if(draftRoomTemperature == null) {draftRoomTemperature = dev['roomThermostat/roomTemperature'];}

var roomTemperatureStack = [];
storeRoomsTemperature(roomsTemperature());
dev['roomThermostat/log9'] = '(0)';

var oldTemperatureValue = 0;
var oldTemperatureDate = new Date();

// Событие изменения температуры датчика, возникает сильно саще чем производится расчет
// Примитивный фильтр используется для избежания скачков значений
defineRule('draftRoomTemperature', {
  whenChanged: controlTermometr,
  then: function (newValue, devName, cellName) {
    if(Math.abs(draftRoomTemperature - newValue) < 1) {
      draftRoomTemperature = (draftRoomTemperature + newValue) / 2;
    }
  }
});

function roomsTemperature() {
  try {
    if(draftRoomTemperature == 0) {return dev['roomThermostat/roomTemperature'];}
    return Math.round(draftRoomTemperature * 10) / 10;
  } catch (error) {
    return dev['roomThermostat/roomTemperature'];
  }
}

function lastRoomsTemperature(index) {
  if(index < roomTemperatureStack.length) {
    return roomTemperatureStack[index];
  }
  return roomTemperatureStack[roomTemperatureStack.length - 1];
}

function storeRoomsTemperature(roomTemperature) {
  var stackDepth = 2;
  if(roomTemperatureStack.length == stackDepth) {
    roomTemperatureStack.shift();
  }
  roomTemperatureStack.push(roomTemperature);
  dev['roomThermostat/roomTemperature'] = roomTemperature;
}

function maxRoomTemperatureSetpoint() {
  return dev['roomThermostat/roomTemperatureSetpoint'] + dev['roomThermostat/gisterezis'] / 2 - roomTemperatureAccuracy;
}

function minRroomTemperatureSetpoint() {
  return dev['roomThermostat/roomTemperatureSetpoint'] - dev['roomThermostat/gisterezis'] / 2 + roomTemperatureAccuracy;
}

function setHeatingSetpoint() {

  var roomTemperatureSetpoint = dev['roomThermostat/roomTemperatureSetpoint'];
  var gisterezis = dev['roomThermostat/gisterezis'];
  
  var heatingSetpoint = dev[controlHeatingSetpoint];  
  var roomTemperature = roomsTemperature();

  if(roomTemperature == 0) {return;}

  var hCounter = 'О';
  // Если котел греет ворду в бойлере - ничего не делть
  if(dev[controlBoilerStatus] == 4) {
    hCounter = 'Б';
  } else {
  
    if(heatingSetpoint == maxHeatingSetpoint && roomTemperature <= maxRoomTemperatureSetpoint()){
      // Если уставка отопления равна максимумум, значит прогревается с низких значений
      // Ожидать пока конатная температура не достигнет уставки, плюс половина гистререзиса  
    } else if(heatingSetpoint == 0 && roomTemperature >= minRroomTemperatureSetpoint()){
      // Если уставка отопления на 0, значит остываем после высоких значений
      // Ожидать пока конатная температура не достигнет уставки, минус половины гистререзиса  
    } else {
      
      // Предыдущее значение температуры, 2 периода назад
      var lastRoomTemperature2 = lastRoomsTemperature(0);
      // Предыдущее значение температуры, период назад
      var lastRoomTemperature = lastRoomsTemperature(1);
      
      // Если комнатная температура больше допустимой
      if(roomTemperature >= maxRoomTemperatureSetpoint()) {
        // Комнатная температура больше уставки на величину гистерезиса - отключаем котел
        if(roomTemperature - roomTemperatureSetpoint >= gisterezis) {
          heatingSetpoint = 0;
        } else {
          if(lastRoomTemperature < roomTemperature){
            heatingSetpoint -= stepSetpoint * 5;
          } else if(lastRoomTemperature2 < roomTemperature){
            heatingSetpoint -= stepSetpoint * 3;
          } else if(lastRoomTemperature2 == roomTemperature){
            heatingSetpoint -= stepSetpoint;
          }
          if(heatingSetpoint < roomTemperatureSetpoint + targetDifference) {heatingSetpoint = roomTemperatureSetpoint + targetDifference;}
        }
      // Если комнатная температура меньше допустимой
      } else if(roomTemperature <= minRroomTemperatureSetpoint()) {
        // Если комнатная температура меньше уставки больше гистрезиса - включить котел на полную мощность
        if(roomTemperatureSetpoint - roomTemperature >= gisterezis) {
          heatingSetpoint = maxHeatingSetpoint;
        } else {
          if(lastRoomTemperature > roomTemperature) {
            heatingSetpoint += stepSetpoint * 5;
          } else if(lastRoomTemperature2 > roomTemperature) {
            heatingSetpoint += stepSetpoint * 3;
          } else if(lastRoomTemperature2 == roomTemperature) {
            heatingSetpoint += stepSetpoint;
          }
        }
      } else if(roomTemperature < maxRoomTemperatureSetpoint() && roomTemperature > minRroomTemperatureSetpoint()) {
         if (roomTemperature != oldTemperatureValue) {
           var localStep = 0;
           var sign = 1;
           if(new Date() - oldTemperatureDate <= (calculationPeriod + calculationPeriod /2) * 60 * 1000) {
             localStep = 3;
           } else if(new Date() - oldTemperatureDate <= (2 * calculationPeriod + calculationPeriod /2) * 60 * 1000) {
             localStep = 2;
//           } else if(new Date() - oldTemperatureDate <= (3 * calculationPeriod + calculationPeriod /2) * 60 * 1000) {
           } else  {
             localStep = 1;
           }
           if(localStep > 0) {
             if (roomTemperature > oldTemperatureValue) {sign = -1;}
             heatingSetpoint = heatingSetpoint + (localStep * sign);
           }
         }
        }
      
      // Проверка того, что уставка температуры отопления не выходит за допустимые пределы
      if(heatingSetpoint > maxHeatingSetpoint) {heatingSetpoint = maxHeatingSetpoint;}
      if(heatingSetpoint < 0) {heatingSetpoint = 0;}
      
      // Отправка уставки в котел
      dev[controlHeatingSetpoint] = heatingSetpoint;
    }
  }
  
  storeRoomsTemperature(roomTemperature);
  
  // Обновление истории изменения установок
  var logMessage = '{}: rT = {}; rTsp = {}; hTsp = {}'.format(hCounter, roomTemperature.toFixed(1), roomTemperatureSetpoint, heatingSetpoint);
  var countsLogMessage = parseInt(dev['roomThermostat/log9'].slice(-2, -1));
  if(dev['roomThermostat/log9'].slice(0, 34) != logMessage || countsLogMessage == 9) {
    countsLogMessage = 0;
    for(index = 0; index < 9; index++) {
      var cellTitle = getDevice('roomThermostat').getControl('log{}'.format(index + 1)).getTitle();
      getDevice('roomThermostat').getControl('log{}'.format(index)).setTitle(cellTitle);
      if(cellTitle == '-') {
        dev['roomThermostat/log{}'.format(index)] = '';
      } else {
        dev['roomThermostat/log{}'.format(index)] = '' + dev['roomThermostat/log{}'.format(index + 1)];
      }
    }
  } else {
    countsLogMessage++;
  }
  getDevice('roomThermostat').getControl('log9').setTitle((new Date()).toString().slice(8, 16));
  logMessage = "{} ({})".format(logMessage, countsLogMessage);
  dev['roomThermostat/log9'] = logMessage;
  log.debug(logMessage);
  if (oldTemperatureValue != roomTemperature) {
    oldTemperatureDate = new Date();
    oldTemperatureValue = roomTemperature;
  }
}

// Первый запуск
setHeatingSetpoint();

// Последующие с интервалом
setInterval(setHeatingSetpoint, calculationPeriod * 60 * 1000);
